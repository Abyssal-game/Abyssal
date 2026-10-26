-- ABYSSAL v796 : les cadeaux ne se reprennent pas en supprimant puis recréant son compte avec le même e-mail.
-- À coller UNE fois dans Supabase → SQL Editor → New query → Run (se recolle sans risque).
-- Quand un compte est supprimé (par le joueur, ou depuis le tableau de bord), on garde une EMPREINTE de son e-mail
-- (sha256, l'e-mail lui-même n'est pas gardé) et seulement ce qui sert aux cadeaux : date de création, booster gratuit,
-- offrande, Épreuves, missions, Torches et Braise du jour. Un nouveau compte avec le même e-mail commence sans les
-- 2 boosters de bienvenue et sans redonner ce qui a déjà été reçu aujourd'hui (serveur de partie, serveur/partie.mjs).

create table if not exists public.gift_memory (
  email_hash text primary key,
  data jsonb not null default '{}'::jsonb,
  deleted_at timestamptz not null default now()
);
alter table public.gift_memory enable row level security; -- aucune règle : personne ne la lit, sauf le serveur
revoke all on public.gift_memory from public, anon, authenticated;

create or replace function public.gift_email_hash(p_email text)
returns text language sql immutable set search_path = public as $$
  select case when p_email is null or trim(p_email) = '' then null
    else encode(sha256(convert_to(lower(trim(p_email)), 'UTF8')), 'hex') end
$$;

-- avant chaque suppression d'un compte : on retient l'empreinte de l'e-mail et les cadeaux déjà reçus
create or replace function public.gift_remember()
returns trigger language plpgsql security definer set search_path = public as $$
declare h text; d jsonb; k jsonb := '{}'::jsonb; f text;
begin
  begin
    h := public.gift_email_hash(old.email);
    if h is null then return old; end if;
    d := (select p.data from public.parties p where p.user_id = old.id);
    if d is null then d := (select s.data from public.saves s where s.user_id = old.id); end if;
    d := coalesce(d, '{}'::jsonb);
    foreach f in array array['createdAt', 'createdDay', 'freePack', 'daily', 'trials', 'missions', 'braiseFree', 'descent'] loop
      if d ? f then k := k || jsonb_build_object(f, d -> f); end if;
    end loop;
    if not (k ? 'createdAt') then k := k || jsonb_build_object('createdAt', (extract(epoch from old.created_at) * 1000)::bigint); end if;
    insert into public.gift_memory as m (email_hash, data, deleted_at) values (h, k, now())
      on conflict (email_hash) do update set data = excluded.data, deleted_at = now();
  exception when others then null; -- jamais bloquant : la suppression du compte passe toujours
  end;
  return old;
end $$;

drop trigger if exists gift_remember on auth.users;
create trigger gift_remember before delete on auth.users for each row execute function public.gift_remember();

-- lu par le serveur de partie quand il crée une partie neuve
create or replace function public.partie_gift_memory(p_uid uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select m.data from public.gift_memory m
  where m.email_hash = public.gift_email_hash((select u.email from auth.users u where u.id = p_uid))
$$;

revoke execute on function public.gift_remember() from public, anon, authenticated;
revoke execute on function public.partie_gift_memory(uuid) from public, anon, authenticated;
grant execute on function public.partie_gift_memory(uuid) to service_role;
revoke execute on function public.gift_email_hash(text) from public, anon, authenticated;


-- ABYSSAL:empreinte (écrite par tools/sql-stamp.mjs, ne pas modifier)
create table if not exists public.sql_stamps (file text primary key, stamp text not null, at timestamptz not null default now());
alter table public.sql_stamps enable row level security;
revoke all on public.sql_stamps from public, anon, authenticated;
insert into public.sql_stamps (file, stamp) values ('19', 'bd1c7e99dab6') on conflict (file) do update set stamp = excluded.stamp, at = now();
create or replace function public.sql_stamps() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(file, stamp), '{}'::jsonb) from public.sql_stamps;
$$;
revoke execute on function public.sql_stamps() from public, anon;
grant execute on function public.sql_stamps() to authenticated;
-- ABYSSAL:fin

-- Vérification
select 'mémoire des cadeaux prête' as etat;
