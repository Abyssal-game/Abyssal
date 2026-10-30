-- ABYSSAL · étape 17 : notifications envoyées par le serveur, même quand l'app est fermée.
-- À coller dans Supabase : SQL Editor → New query → Run. Peut être relancé sans risque.
--
-- Le téléphone donne son adresse de notification (push_register) ; quand il se passe quelque chose pour un joueur
-- (ton adversaire a joué, défi reçu, ton Pari relevé, demande d'ami…), une ligne entre dans la file push_queue
-- et la fonction Supabase « push » (supabase/functions/push) l'envoie au téléphone par Apple (APNs).
-- La fonction est appelée tout de suite par pg_net, et toutes les minutes par pg_cron tant qu'il reste quelque chose
-- à envoyer (filet de sécurité). Les deux extensions s'activent ci-dessous ; si l'une manque, le jeu marche quand même.

do $$ begin create extension if not exists pg_net with schema extensions; exception when others then raise notice 'pg_net indisponible'; end $$;
do $$ begin create extension if not exists pg_cron; exception when others then raise notice 'pg_cron indisponible'; end $$;

-- ——— Adresses de notification des téléphones ————————————————————————————————————
create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  lang text not null default 'fr',
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;
revoke all on public.push_tokens from anon, authenticated;

-- ——— File des notifications à envoyer ———————————————————————————————————————————————
create table if not exists public.push_queue (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  taken_at timestamptz,
  tries int not null default 0,
  sent_at timestamptz
);
create index if not exists push_queue_todo on public.push_queue (id) where sent_at is null;
create index if not exists push_queue_user on public.push_queue (user_id, created_at desc);
alter table public.push_queue enable row level security;
revoke all on public.push_queue from anon, authenticated;

-- Le téléphone enregistre (ou rafraîchit) son adresse : une adresse appartient au dernier compte connecté dessus
create or replace function public.push_register(p_token text, p_platform text, p_lang text default 'fr')
returns void language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  if p_platform is null or p_platform not in ('ios', 'android') then raise exception 'Téléphone inconnu.'; end if;
  if p_token is null or (p_platform = 'ios' and p_token !~ '^[0-9a-fA-F]{64,200}$') or (p_platform = 'android' and p_token !~ '^[A-Za-z0-9:_\-]{20,400}$') then
    raise exception 'Adresse de notification illisible.';
  end if;
  if not exists (select 1 from public.profiles where id = me) then return; end if;
  insert into public.push_tokens (token, user_id, platform, lang, updated_at)
    values (case when p_platform = 'ios' then lower(p_token) else p_token end, me, p_platform, /* v917 : une adresse Android distingue majuscules et minuscules */ case when p_lang in ('fr', 'en', 'es', 'de', 'it', 'pt') then p_lang else 'fr' end, now())
    on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, lang = excluded.lang, updated_at = now();
  -- 5 téléphones au plus par compte : les plus anciens sont oubliés
  delete from public.push_tokens t where t.user_id = me and t.token not in
    (select token from public.push_tokens where user_id = me order by updated_at desc limit 5);
end $$;

-- Notifications coupées dans les Réglages, ou déconnexion : le téléphone retire son adresse
create or replace function public.push_unregister(p_token text)
returns void language sql volatile security definer set search_path = public as $$
  delete from public.push_tokens where token in (p_token, lower(p_token)) and user_id = auth.uid();
$$;
revoke execute on function public.push_register(text, text, text) from public, anon;
revoke execute on function public.push_unregister(text) from public, anon;
grant execute on function public.push_register(text, text, text) to authenticated;
grant execute on function public.push_unregister(text) to authenticated;

-- Réveille la fonction « push » (sans attendre sa réponse). Jamais bloquant pour le jeu.
create or replace function public.push_kick()
returns void language plpgsql volatile security definer set search_path = public, extensions as $$
begin
  perform net.http_post(url := 'https://zwyxnrvvctanzsssyirm.supabase.co/functions/v1/push',
    body := '{}'::jsonb, headers := '{"Content-Type": "application/json"}'::jsonb, timeout_milliseconds := 8000);
exception when others then null;
end $$;
revoke execute on function public.push_kick() from public, anon, authenticated;

-- Met une notification dans la file (seulement si le joueur a un téléphone inscrit) ; pas deux fois la même en 10 min,
-- pas plus de 40 par jour et par joueur
create or replace function public.push_enqueue(p_user uuid, p_kind text, p_data jsonb)
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if p_user is null or not exists (select 1 from public.push_tokens where user_id = p_user) then return; end if;
  if exists (select 1 from public.push_queue q where q.user_id = p_user and q.kind = p_kind
      and coalesce(q.data->>'ref', '') = coalesce(p_data->>'ref', '') and q.created_at > now() - interval '10 minutes'
      and (q.sent_at is null or q.kind in ('friend', 'friend_ok', 'wager', 'wager_done', 'challenge'))) then return; end if;
  if (select count(*) from public.push_queue where user_id = p_user and created_at > now() - interval '1 day') >= 40 then return; end if;
  insert into public.push_queue (user_id, kind, data) values (p_user, p_kind, coalesce(p_data, '{}'::jsonb));
  perform public.push_kick();
end $$;
revoke execute on function public.push_enqueue(uuid, text, jsonb) from public, anon, authenticated;

create or replace function public.push_pseudo(p_id uuid) returns text language sql stable security definer set search_path = public as $$
  select coalesce((select pseudo from public.profiles where id = p_id), '')
$$;
revoke execute on function public.push_pseudo(uuid) from public, anon, authenticated;

-- ——— Ce qui déclenche une notification ———————————————————————————————————————————————
-- Parties en ligne : défi d'un ami, partie qui commence, à toi de jouer (parties lentes), partie terminée (parties lentes)
create or replace function public.push_on_match()
returns trigger language plpgsql security definer set search_path = public as $$
declare d jsonb;
begin
  d := jsonb_build_object('game', new.game, 'ref', new.id::text, 'pace', new.pace);
  if tg_op = 'INSERT' then
    if new.b is not null and new.status = 'waiting' then
      perform public.push_enqueue(new.b, 'challenge', d || jsonb_build_object('who', public.push_pseudo(new.a), 'ref', new.id::text || ':c'));
    end if;
    return new;
  end if;
  if old.status = 'waiting' and new.status = 'playing' then
    perform public.push_enqueue(new.a, case when new.public then 'found' else 'accepted' end, d || jsonb_build_object('who', public.push_pseudo(new.b), 'ref', new.id::text || ':s'));
    return new;
  end if;
  if new.pace = 'slow' and new.status = 'playing' and old.status = 'playing' and new.turn is distinct from old.turn then
    if new.turn in ('a', 'ab') then perform public.push_enqueue(new.a, 'turn', d || jsonb_build_object('who', public.push_pseudo(new.b))); end if;
    if new.turn in ('b', 'ab') then perform public.push_enqueue(new.b, 'turn', d || jsonb_build_object('who', public.push_pseudo(new.a))); end if;
    return new;
  end if;
  if new.pace = 'slow' and old.status = 'playing' and new.status = 'done' then
    perform public.push_enqueue(new.a, 'end', d || jsonb_build_object('who', public.push_pseudo(new.b), 'res', case when new.winner = 'a' then 'win' when new.winner = 'b' then 'lose' else 'draw' end, 'reason', coalesce(new.reason, ''), 'ref', new.id::text || ':e'));
    perform public.push_enqueue(new.b, 'end', d || jsonb_build_object('who', public.push_pseudo(new.a), 'res', case when new.winner = 'b' then 'win' when new.winner = 'a' then 'lose' else 'draw' end, 'reason', coalesce(new.reason, ''), 'ref', new.id::text || ':e'));
  end if;
  return new;
exception when others then return new; -- une notification ne doit jamais empêcher un coup
end $$;
drop trigger if exists push_on_match on public.mp_matches;
create trigger push_on_match after insert or update on public.mp_matches for each row execute function public.push_on_match();

-- Pari des Boosters : défi reçu d'un ami, ton défi relevé
create or replace function public.push_on_versus()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.b is not null and new.status = 'open' then perform public.push_enqueue(new.b, 'wager', jsonb_build_object('who', public.push_pseudo(new.a), 'ref', new.id::text)); end if;
  elsif old.status = 'open' and new.status = 'done' and new.b is not null then
    perform public.push_enqueue(new.a, 'wager_done', jsonb_build_object('who', public.push_pseudo(new.b), 'ref', new.id::text,
      'res', case when new.a_score > new.b_score then 'win' when new.a_score < new.b_score then 'lose' else 'draw' end));
  end if;
  return new;
exception when others then return new;
end $$;
drop trigger if exists push_on_versus on public.versus_duels;
create trigger push_on_versus after insert or update on public.versus_duels for each row execute function public.push_on_versus();

-- Amis : demande reçue, demande acceptée
create or replace function public.push_on_friend()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform public.push_enqueue(new.b, 'friend', jsonb_build_object('who', public.push_pseudo(new.a), 'ref', new.a::text));
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' then
    perform public.push_enqueue(new.a, 'friend_ok', jsonb_build_object('who', public.push_pseudo(new.b), 'ref', new.b::text));
  end if;
  return new;
exception when others then return new;
end $$;
drop trigger if exists push_on_friend on public.friendships;
create trigger push_on_friend after insert or update on public.friendships for each row execute function public.push_on_friend();

-- ——— Pour la fonction « push » seulement (clé secrète du serveur) ——————————————————————————
-- Prend jusqu'à p_limit notifications à envoyer, avec les téléphones de chaque joueur
create or replace function public.push_take(p_limit int default 50)
returns table (id bigint, kind text, data jsonb, tokens jsonb)
language plpgsql volatile security definer set search_path = public as $$
begin
  return query
  with picked as (
    select q.id from public.push_queue q
    where q.sent_at is null and q.tries < 3 and q.created_at > now() - interval '1 day'
      and (q.taken_at is null or q.taken_at < now() - interval '2 minutes')
    order by q.id limit greatest(1, least(coalesce(p_limit, 50), 200)) for update skip locked
  ), upd as (
    update public.push_queue q set tries = q.tries + 1, taken_at = now() from picked where q.id = picked.id
    returning q.id, q.user_id, q.kind, q.data
  )
  select upd.id, upd.kind, upd.data,
    coalesce((select jsonb_agg(jsonb_build_object('token', t.token, 'platform', t.platform, 'lang', t.lang)) from public.push_tokens t where t.user_id = upd.user_id), '[]'::jsonb)
  from upd order by upd.id;
end $$;
create or replace function public.push_done(p_ids bigint[])
returns void language sql volatile security definer set search_path = public as $$
  update public.push_queue set sent_at = now() where id = any(p_ids);
  delete from public.push_queue where created_at < now() - interval '7 days';
$$;
create or replace function public.push_drop(p_token text)
returns void language sql volatile security definer set search_path = public as $$
  delete from public.push_tokens where token in (p_token, lower(p_token));
$$;
revoke execute on function public.push_take(int) from public, anon, authenticated;
revoke execute on function public.push_done(bigint[]) from public, anon, authenticated;
revoke execute on function public.push_drop(text) from public, anon, authenticated;
grant execute on function public.push_take(int) to service_role;
grant execute on function public.push_done(bigint[]) to service_role;
grant execute on function public.push_drop(text) to service_role;

-- Filet de sécurité : toutes les minutes, s'il reste une notification à envoyer, la fonction est réveillée
create or replace function public.push_tick()
returns void language plpgsql volatile security definer set search_path = public as $$
begin
  if exists (select 1 from public.push_queue where sent_at is null and tries < 3 and created_at > now() - interval '1 day') then
    perform public.push_kick();
  end if;
end $$;
revoke execute on function public.push_tick() from public, anon, authenticated;
do $$ begin
  perform cron.unschedule('abyssal-push') where exists (select 1 from cron.job where jobname = 'abyssal-push');
  perform cron.schedule('abyssal-push', '* * * * *', 'select public.push_tick()');
exception when others then raise notice 'pg_cron indisponible : seul l’appel immédiat est actif.';
end $$;


-- ABYSSAL:empreinte (écrite par tools/sql-stamp.mjs, ne pas modifier)
create table if not exists public.sql_stamps (file text primary key, stamp text not null, at timestamptz not null default now());
alter table public.sql_stamps enable row level security;
revoke all on public.sql_stamps from public, anon, authenticated;
insert into public.sql_stamps (file, stamp) values ('17', '2e6f02f2b22b') on conflict (file) do update set stamp = excluded.stamp, at = now();
create or replace function public.sql_stamps() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(file, stamp), '{}'::jsonb) from public.sql_stamps;
$$;
revoke execute on function public.sql_stamps() from public, anon;
grant execute on function public.sql_stamps() to authenticated;
-- ABYSSAL:fin

-- Vérification
select 'notifications prêtes' as etat;
