-- ABYSSAL v881 : le parrainage (demande du propriétaire du 28 octobre 2026).
-- À coller dans Supabase → SQL Editor → New query → Run (après 12-serveur-de-partie.sql). Se recolle sans danger.
--
-- Un nouveau joueur entre le pseudo de son parrain dans ses 7 premiers jours. Le parrainage est validé par le serveur de
-- partie quand le filleul a joué 3 jours différents dans les 14 jours qui suivent ET vaincu le premier gardien, et
-- seulement s'il ne joue pas sur un téléphone déjà utilisé par son parrain. Les récompenses sont données par le serveur
-- de partie (serveur/partie.mjs, js/core/parrain.js) : le cadeau du filleul, et les 10 paliers du parrain.

create table if not exists public.parrainages (
  filleul uuid primary key, -- sans lien vers auth.users : un filleul qui supprime son compte garde sa place (le parrain ne la regagne pas)
  parrain uuid not null references auth.users(id) on delete cascade,
  linked_at timestamptz not null default now(),
  days text[] not null default '{}',
  boss boolean not null default false,
  state text not null default 'wait' check (state in ('wait', 'ok', 'expired', 'device')),
  validated_at timestamptz,
  rank int,
  check (filleul <> parrain)
);
create index if not exists parrainages_parrain on public.parrainages (parrain);
alter table public.parrainages enable row level security; -- aucune règle : lu par les fonctions ci-dessous seulement
revoke all on public.parrainages from public, anon, authenticated;

-- deux comptes qui ont joué sur le même téléphone (numéros d'appareil du serveur de partie)
create or replace function public.parrain_same_device(x uuid, y uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from jsonb_object_keys(coalesce((select seqs from public.parties where user_id = x), '{}'::jsonb)) a(k)
    join jsonb_object_keys(coalesce((select seqs from public.parties where user_id = y), '{}'::jsonb)) b(k) on a.k = b.k
    where a.k like 'd:%'
  )
$$;

-- Le filleul entre le code (pseudo du parrain). Appelé par le serveur de partie.
create or replace function public.parrain_link(p_uid uuid, p_code text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare other uuid; nm text; born timestamptz; mail text;
begin
  if exists (select 1 from public.parrainages where filleul = p_uid) then raise exception 'Tu as déjà un parrain.'; end if;
  select u.created_at, u.email into born, mail from auth.users u where u.id = p_uid;
  if born is null or born < now() - interval '7 days' then raise exception 'Le code d’un parrain s’entre dans les 7 premiers jours du compte.'; end if;
  select id, pseudo into other, nm from public.profiles where lower(pseudo) = lower(trim(p_code));
  if other is null then raise exception 'Aucun joueur ne porte ce pseudo.'; end if;
  if other = p_uid then raise exception 'Tu ne peux pas être ton propre parrain.'; end if;
  if exists (select 1 from public.parrainages where filleul = other and parrain = p_uid) then raise exception 'Ce joueur est ton filleul : il ne peut pas être ton parrain.'; end if;
  begin
    if exists (select 1 from public.gift_memory m where m.email_hash = public.gift_email_hash(mail)) then
      raise exception 'Cette adresse e-mail a déjà eu un compte : le parrainage est réservé aux nouveaux joueurs.';
    end if;
  exception when undefined_table or undefined_function then null; -- 19-cadeaux.sql pas encore collé
  end;
  if public.parrain_same_device(p_uid, other) then raise exception 'Ton parrain a déjà joué sur ce téléphone : le parrainage n’est pas possible.'; end if;
  insert into public.parrainages (filleul, parrain) values (p_uid, other);
  -- parrain et filleul deviennent amis
  begin
    if not exists (select 1 from public.friendships f where (f.a = p_uid and f.b = other) or (f.a = other and f.b = p_uid)) then
      insert into public.friendships (a, b, status) values (p_uid, other, 'accepted');
    else
      update public.friendships set status = 'accepted' where (a = p_uid and b = other) or (a = other and b = p_uid);
    end if;
  exception when others then null; -- pas de pseudo encore, ou amis indisponibles : le parrainage compte quand même
  end;
  return jsonb_build_object('pseudo', nm);
end $$;

-- À chaque passage (au plus toutes les 10 minutes) : note le jour joué du filleul, valide son parrainage si tout est rempli,
-- et rend les paliers gagnés comme parrain. p_day = jour du joueur (son fuseau), p_boss = premier gardien vaincu.
create or replace function public.parrain_tick(p_uid uuid, p_day text, p_boss boolean)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare r public.parrainages; nm text; n int; has boolean;
begin
  select * into r from public.parrainages where filleul = p_uid for update;
  has := found;
  if has and r.state = 'wait' then
    if now() > r.linked_at + interval '14 days' then
      update public.parrainages set state = 'expired' where filleul = p_uid;
    elsif public.parrain_same_device(p_uid, r.parrain) then
      update public.parrainages set state = 'device' where filleul = p_uid;
    else
      if p_day ~ '^\d{4}-\d{2}-\d{2}$' and not (p_day = any (r.days)) then r.days := array_append(r.days, p_day); end if;
      r.boss := r.boss or coalesce(p_boss, false);
      if coalesce(array_length(r.days, 1), 0) >= 3 and r.boss then
        perform 1 from public.parrainages where parrain = r.parrain for update;
        select coalesce(max(rank), 0) + 1 into n from public.parrainages where parrain = r.parrain and state = 'ok';
        update public.parrainages set days = r.days, boss = true, state = 'ok', validated_at = now(), rank = n where filleul = p_uid;
      else
        update public.parrainages set days = r.days, boss = r.boss where filleul = p_uid;
      end if;
    end if;
    select * into r from public.parrainages where filleul = p_uid;
  end if;
  if has then select pseudo into nm from public.profiles where id = r.parrain; end if;
  return jsonb_build_object(
    'me', case when not has then null else jsonb_build_object('state', r.state, 'parrain', nm, 'days', coalesce(array_length(r.days, 1), 0), 'boss', r.boss) end,
    'ranks', coalesce((select jsonb_agg(p.rank order by p.rank) from public.parrainages p where p.parrain = p_uid and p.state = 'ok' and p.rank <= 10), '[]'::jsonb)
  );
end $$;

-- Pour l'écran Parrainage : mon parrain et mes filleuls (pseudo, jours joués, gardien, état)
create or replace function public.parrain_list()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'mine', (select jsonb_build_object('parrain', pp.pseudo, 'state', p.state, 'days', coalesce(array_length(p.days, 1), 0), 'boss', p.boss, 'since', p.linked_at)
             from public.parrainages p left join public.profiles pp on pp.id = p.parrain where p.filleul = auth.uid()),
    'kids', coalesce((select jsonb_agg(jsonb_build_object('pseudo', f.pseudo, 'state', p.state, 'days', coalesce(array_length(p.days, 1), 0), 'boss', p.boss, 'rank', p.rank, 'since', p.linked_at) order by p.linked_at desc)
             from public.parrainages p left join public.profiles f on f.id = p.filleul where p.parrain = auth.uid()), '[]'::jsonb),
    'born', (select u.created_at from auth.users u where u.id = auth.uid())
  )
$$;

revoke execute on function public.parrain_same_device(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.parrain_link(uuid, text) from public, anon, authenticated;
revoke execute on function public.parrain_tick(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.parrain_link(uuid, text) to service_role;
grant execute on function public.parrain_tick(uuid, text, boolean) to service_role;
revoke execute on function public.parrain_list() from public, anon;
grant execute on function public.parrain_list() to authenticated;


-- ABYSSAL:empreinte (écrite par tools/sql-stamp.mjs, ne pas modifier)
create table if not exists public.sql_stamps (file text primary key, stamp text not null, at timestamptz not null default now());
alter table public.sql_stamps enable row level security;
revoke all on public.sql_stamps from public, anon, authenticated;
insert into public.sql_stamps (file, stamp) values ('21', '8f93dd3632b2') on conflict (file) do update set stamp = excluded.stamp, at = now();
create or replace function public.sql_stamps() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(file, stamp), '{}'::jsonb) from public.sql_stamps;
$$;
revoke execute on function public.sql_stamps() from public, anon;
grant execute on function public.sql_stamps() to authenticated;
-- ABYSSAL:fin

-- Vérification
select 'parrainage prêt' as etat;
