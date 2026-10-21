-- ABYSSAL v539 : le serveur de partie (anti-triche, étape 1). Décision du propriétaire du 21 octobre 2026 :
-- « la progression d'un profil est sauvegardée par rapport au compte, pas par le téléphone ».
-- À coller dans Supabase → SQL Editor → New query → Run (après 01 à 11). Se recolle sans danger.
--
-- La partie de chaque compte vit dans la table « parties ». Seule la fonction serveur « partie »
-- (supabase/functions/partie, publiée par GitHub) peut l'écrire : elle rejoue chaque action du joueur avec le moteur du jeu.
-- Le joueur peut seulement la lire. Rien n'est fermé ici pour les anciennes versions du jeu : le verrouillage
-- (plus d'écriture directe des sauvegardes, des profils et des fiches) viendra dans un second fichier, une fois le serveur vérifié.

create table if not exists public.parties (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb,
  version bigint not null default 0,
  seqs jsonb not null default '{}'::jsonb,
  tz int,
  tz_at bigint,
  busy_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.parties enable row level security;
drop policy if exists "ma partie (lecture)" on public.parties;
create policy "ma partie (lecture)" on public.parties for select to authenticated using (user_id = auth.uid());
revoke all on public.parties from anon, authenticated;
grant select (user_id, data, version, updated_at) on public.parties to authenticated;

-- ——— Fonctions réservées au serveur (clé secrète) ——————————————————————————————————————
-- Prendre la main sur une partie (un seul traitement à la fois par compte, 20 s au plus)
create or replace function public.partie_lock(p_uid uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare r public.parties;
begin
  insert into public.parties (user_id) values (p_uid) on conflict do nothing;
  update public.parties set busy_until = now() + interval '20 seconds'
    where user_id = p_uid and (busy_until is null or busy_until < now())
    returning * into r;
  if not found then return null; end if;
  return jsonb_build_object('data', r.data, 'version', r.version, 'seqs', r.seqs, 'tz', r.tz, 'tz_at', r.tz_at);
end $$;

create or replace function public.partie_save(p_uid uuid, p_data jsonb, p_version bigint, p_seqs jsonb, p_tz int, p_tz_at bigint)
returns boolean language plpgsql volatile security definer set search_path = public as $$
begin
  update public.parties set data = p_data, version = p_version, seqs = coalesce(p_seqs, '{}'::jsonb), tz = p_tz, tz_at = p_tz_at,
    busy_until = null, updated_at = now()
    where user_id = p_uid and version = p_version - 1;
  return found;
end $$;

create or replace function public.partie_unlock(p_uid uuid)
returns void language sql volatile security definer set search_path = public as $$
  update public.parties set busy_until = null where user_id = p_uid
$$;

-- Ancienne sauvegarde en ligne (reprise une seule fois, à la première connexion au serveur de partie)
create or replace function public.partie_legacy(p_uid uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select data from public.saves where user_id = p_uid
$$;

create or replace function public.partie_creator(p_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select badge = 'createur' from public.profiles where id = p_uid), false)
$$;

create or replace function public.partie_versus(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if to_regclass('public.versus_duels') is null then return null; end if;
  execute 'select jsonb_build_object(''stake'', stake, ''status'', status) from public.versus_duels where id = $1' into r using p_id;
  return r;
end $$;

create or replace function public.partie_shadow_drew(p_uid uuid, p_day date)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare n int;
begin
  if to_regclass('public.shadow_draws') is null then return false; end if;
  execute 'select count(*) from public.shadow_draws where user_id = $1 and day = $2' into n using p_uid, p_day;
  return n > 0;
end $$;

-- Ce que les autres voient, calculé par le serveur : profil public, fiche d'ami, Épreuves gagnées (classement du jour)
create or replace function public.partie_publish(p_uid uuid, p_profile jsonb, p_card jsonb, p_trials jsonb)
returns void language plpgsql volatile security definer set search_path = public as $$
declare t jsonb; total int;
begin
  if not exists (select 1 from public.profiles where id = p_uid) then return; end if;
  update public.profiles set avatar = p_profile ->> 'avatar', title = p_profile ->> 'title',
    level = coalesce((p_profile ->> 'level')::int, 1), owned = coalesce((p_profile ->> 'owned')::int, 0), updated_at = now()
    where id = p_uid;
  -- v564 : cadre et plaque de pseudo (colonnes ajoutées par 15-vitrine.sql)
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'plate') then
    execute 'update public.profiles set frame = $2, plate = $3 where id = $1' using p_uid, p_profile ->> 'frame', p_profile ->> 'plate';
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'sachet') then
      execute 'update public.profiles set sachet = $2 where id = $1' using p_uid, p_profile ->> 'sachet'; -- v565
    end if;
  end if;
  if p_card is not null and to_regclass('public.player_cards') is not null and octet_length(p_card::text) < 100000 then
    execute 'insert into public.player_cards (id, data, updated_at) values ($1, $2, now())
             on conflict (id) do update set data = excluded.data, updated_at = now()' using p_uid, p_card;
  end if;
  if p_trials is not null and jsonb_array_length(p_trials) > 0 and to_regclass('public.trial_wins') is not null then
    for t in select * from jsonb_array_elements(p_trials) loop
      execute 'insert into public.trial_wins (user_id, day, idx, hp) values ($1, $2, $3, $4) on conflict do nothing'
        using p_uid, (t ->> 'day')::date, (t ->> 'idx')::int, greatest(0, least(100, (t ->> 'hp')::int));
      execute 'select sum(100 + hp) from public.trial_wins where user_id = $1 and day = $2' into total using p_uid, (t ->> 'day')::date;
      insert into public.descent_scores (user_id, day, floor, cursed) values (p_uid, (t ->> 'day')::date, total, false)
        on conflict (user_id, day) do update set floor = excluded.floor, updated_at = now();
    end loop;
  end if;
end $$;

do $$
declare f text;
begin
  foreach f in array array['partie_lock(uuid)', 'partie_save(uuid, jsonb, bigint, jsonb, int, bigint)', 'partie_unlock(uuid)', 'partie_legacy(uuid)',
    'partie_creator(uuid)', 'partie_versus(uuid)', 'partie_shadow_drew(uuid, date)', 'partie_publish(uuid, jsonb, jsonb, jsonb)'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

-- Vérification : le badge « Créateur » ouvre les outils du Mode Créateur sur le serveur
select (select count(*) from public.parties) as parties, (select string_agg(pseudo, ', ') from public.profiles where badge = 'createur') as createurs, 'serveur de partie prêt' as etat;
