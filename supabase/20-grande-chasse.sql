-- ABYSSAL v858 : la Grande Chasse. Chaque semaine, une bête commune à tous les joueurs (js/core/chasse.js).
-- À coller UNE fois dans Supabase → SQL Editor → New query → Run (se recolle sans risque).
-- Les dégâts ne sont écrits QUE par le serveur de partie (serveur/partie.mjs, clé secrète) après avoir rejoué le combat :
-- un téléphone ne peut pas s'en inventer. Les joueurs lisent seulement la jauge et le classement (chasse_view).

create table if not exists public.chasse_weeks (
  week int primary key,                    -- semaine du jeu (weekIndex : lundi 00 h)
  hp_max bigint not null,                  -- PV de la bête : base + un supplément par chasseur
  dmg bigint not null default 0,           -- dégâts de tous les chasseurs
  hunters int not null default 0,
  killed_at timestamptz,                   -- la bête est tombée
  updated_at timestamptz not null default now()
);
create table if not exists public.chasse_hits (
  week int not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  dmg bigint not null default 0,
  fights int not null default 0,
  best int not null default 0,
  days text[] not null default '{}',       -- jours déjà comptés (un combat par jour)
  updated_at timestamptz not null default now(),
  primary key (week, user_id)
);
create index if not exists chasse_hits_rank on public.chasse_hits (week, dmg desc);
-- v866 : le chasseur dont le combat abat la bête (coup de grâce), et le fil des derniers coups (montré à tous)
alter table public.chasse_weeks add column if not exists killed_by uuid references auth.users(id) on delete set null;
create table if not exists public.chasse_log (
  id bigserial primary key,
  week int not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  dmg int not null,
  at timestamptz not null default now()
);
create index if not exists chasse_log_week on public.chasse_log (week, id desc);
alter table public.chasse_log enable row level security;
revoke all on public.chasse_log from public, anon, authenticated;
alter table public.chasse_weeks enable row level security; -- aucune règle : lus seulement par les fonctions ci-dessous
alter table public.chasse_hits enable row level security;
revoke all on public.chasse_weeks from public, anon, authenticated;
revoke all on public.chasse_hits from public, anon, authenticated;

-- PV de la bête (mêmes valeurs que HUNT.baseHp et HUNT.perHunter dans js/core/chasse.js)
create or replace function public.chasse_hp(p_hunters int)
returns bigint language sql immutable as $$ select 500::bigint + 450::bigint * greatest(0, p_hunters) $$; -- v866 : 600 + 350 avant

-- Serveur de partie : ajoute les dégâts d'un combat (une seule fois par jour et par joueur)
create or replace function public.chasse_add(p_uid uuid, p_week int, p_day text, p_dmg int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare h public.chasse_hits; w public.chasse_weeks; d int := greatest(0, least(coalesce(p_dmg, 0), 100000)); fresh boolean := false;
begin
  if p_uid is null or p_week is null or p_day is null then raise exception 'Chasse inconnue.'; end if;
  insert into public.chasse_weeks (week, hp_max) values (p_week, public.chasse_hp(0)) on conflict (week) do nothing;
  select * into w from public.chasse_weeks where week = p_week for update;
  select * into h from public.chasse_hits where week = p_week and user_id = p_uid for update;
  if h.user_id is null then
    insert into public.chasse_hits (week, user_id) values (p_week, p_uid) returning * into h;
    fresh := true;
  end if;
  if p_day = any(h.days) then return jsonb_build_object('ok', false, 'dup', true); end if;
  update public.chasse_hits set dmg = dmg + d, fights = fights + 1, best = greatest(best, d), days = array_append(days, p_day), updated_at = now()
    where week = p_week and user_id = p_uid;
  update public.chasse_weeks set
      hunters = hunters + (case when fresh then 1 else 0 end),
      hp_max = case when killed_at is null then public.chasse_hp(hunters + (case when fresh then 1 else 0 end)) else hp_max end,
      dmg = dmg + d, updated_at = now()
    where week = p_week returning * into w;
  insert into public.chasse_log (week, user_id, dmg) values (p_week, p_uid, d); -- v866 : fil des coups
  delete from public.chasse_log where week < p_week - 3;
  if w.killed_at is null and w.dmg >= w.hp_max then
    update public.chasse_weeks set killed_at = now(), killed_by = p_uid where week = p_week returning * into w; -- v866 : coup de grâce
    -- v866 : notification à tous les chasseurs de la semaine (supabase/17-notifications.sql ; sans lui, rien n'est envoyé)
    begin
      perform public.push_enqueue(x.user_id, 'hunt_kill', jsonb_build_object('ref', p_week::text, 'who', coalesce((select pseudo from public.profiles where id = p_uid), '')))
        from public.chasse_hits x where x.week = p_week and x.user_id <> p_uid;
    exception when others then null;
    end;
  end if;
  return jsonb_build_object('ok', true, 'dmg', w.dmg, 'hp_max', w.hp_max, 'killed', w.killed_at is not null);
end $$;
revoke execute on function public.chasse_add(uuid, int, text, int) from public, anon, authenticated;

-- Serveur de partie : la bête est-elle tombée, et à quel rang ce joueur l'a-t-il blessée ?
create or replace function public.chasse_claim_info(p_uid uuid, p_week int)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'killed', coalesce((select killed_at is not null from public.chasse_weeks where week = p_week), false),
    'rank', (select r from (select user_id, row_number() over (order by dmg desc, updated_at) r from public.chasse_hits where week = p_week) x where x.user_id = p_uid),
    'dmg', coalesce((select dmg from public.chasse_hits where week = p_week and user_id = p_uid), 0),
    'killer', coalesce((select killed_by = p_uid from public.chasse_weeks where week = p_week), false))
$$;
revoke execute on function public.chasse_claim_info(uuid, int) from public, anon, authenticated;

-- v866 : Serveur de partie : palier de la bête (0 à 3) selon sa vie commune (75 %, 50 %, 25 % ; HUNT.tiers dans js/core/chasse.js)
create or replace function public.chasse_tier(p_week int)
returns int language sql stable security definer set search_path = public as $$
  select coalesce((select case when hp_max <= 0 then 0
    when (hp_max - dmg)::numeric / hp_max <= 0.25 then 3
    when (hp_max - dmg)::numeric / hp_max <= 0.5 then 2
    when (hp_max - dmg)::numeric / hp_max <= 0.75 then 1 else 0 end from public.chasse_weeks where week = p_week), 0)
$$;
revoke execute on function public.chasse_tier(int) from public, anon, authenticated;

-- Joueurs connectés : jauge de la bête, les 20 meilleurs chasseurs, et sa propre ligne
create or replace function public.chasse_view(p_week int)
returns jsonb language sql stable security definer set search_path = public as $$
  with w as (select * from public.chasse_weeks where week = p_week),
  ranked as (select h.user_id, h.dmg, h.fights, h.best, row_number() over (order by h.dmg desc, h.updated_at) r from public.chasse_hits h where h.week = p_week)
  select jsonb_build_object(
    'week', p_week,
    'hp_max', coalesce((select hp_max from w), public.chasse_hp(0)),
    'dmg', coalesce((select dmg from w), 0),
    'hunters', coalesce((select hunters from w), 0),
    'killed', (select killed_at from w),
    'killer', (select jsonb_build_object('user_id', p.id, 'pseudo', p.pseudo, 'avatar', p.avatar, 'frame', p.frame, 'plate', p.plate) from w join public.profiles p on p.id = w.killed_by), -- v866
    'feed', coalesce((select jsonb_agg(jsonb_build_object('user_id', l.user_id, 'pseudo', p.pseudo, 'dmg', l.dmg, 'at', l.at) order by l.id desc)
      from (select * from public.chasse_log where week = p_week order by id desc limit 8) l left join public.profiles p on p.id = l.user_id), '[]'::jsonb), -- v866 : derniers coups
    'top', coalesce((select jsonb_agg(jsonb_build_object('user_id', x.user_id, 'rank', x.r, 'dmg', x.dmg, 'fights', x.fights, 'best', x.best,
        'pseudo', p.pseudo, 'avatar', p.avatar, 'frame', p.frame, 'plate', p.plate) order by x.r)
      from ranked x left join public.profiles p on p.id = x.user_id where x.r <= 20), '[]'::jsonb),
    'me', (select jsonb_build_object('rank', x.r, 'dmg', x.dmg, 'fights', x.fights, 'best', x.best) from ranked x where x.user_id = auth.uid()))
$$;
revoke execute on function public.chasse_view(int) from public, anon;
grant execute on function public.chasse_view(int) to authenticated;

-- ABYSSAL:empreinte (écrite par tools/sql-stamp.mjs, ne pas modifier)
create table if not exists public.sql_stamps (file text primary key, stamp text not null, at timestamptz not null default now());
alter table public.sql_stamps enable row level security;
revoke all on public.sql_stamps from public, anon, authenticated;
insert into public.sql_stamps (file, stamp) values ('20', 'e0109ccfc2cc') on conflict (file) do update set stamp = excluded.stamp, at = now();
create or replace function public.sql_stamps() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(file, stamp), '{}'::jsonb) from public.sql_stamps;
$$;
revoke execute on function public.sql_stamps() from public, anon;
grant execute on function public.sql_stamps() to authenticated;
-- ABYSSAL:fin
