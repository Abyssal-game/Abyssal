-- ABYSSAL v564 : ce que les autres joueurs voient de ton apparence (demande du propriétaire du 21 octobre 2026 :
-- « que ça apparaisse sur les classements et pendant les jeux en ligne »). Cadre de profil, plaque de pseudo (v565 : et sachet de booster).
-- À coller dans Supabase → SQL Editor → New query → Run, PUIS recoller 09-multijoueur.sql (réactions en ligne).
-- Se recolle sans danger.

alter table public.profiles add column if not exists frame text;
alter table public.profiles add column if not exists plate text;
alter table public.profiles add column if not exists sachet text; -- v565 : sachet de booster, vu par l'adversaire au Pari
alter table public.profiles add column if not exists choc jsonb; -- v807 : série et ligue du Choc des Boosters
alter table public.profiles add column if not exists boards jsonb; -- v904 : plateaux et dos des mini-jeux (tapis des Sceaux, plateau du Pacte, plateau et dos des Cryptes)

-- garde-fou : une clé simple (lettres minuscules, chiffres, tirets), sinon rien (aucun texte ni code glissé par une app modifiée)
create or replace function public.profiles_cosm_check() returns trigger language plpgsql as $$
begin
  if new.frame is not null and new.frame !~ '^[a-z0-9-]{1,40}$' then new.frame := null; end if;
  if new.plate is not null and new.plate !~ '^pl-[a-z0-9-]{1,40}$' then new.plate := null; end if;
  if new.sachet is not null and new.sachet !~ '^sachet-[a-z0-9-]{1,40}$' then new.sachet := null; end if;
  -- v807 : série (0 à 999), ligue (0 à 4) et mois de la ligue, rien d'autre
  if new.choc is not null then
    if jsonb_typeof(new.choc) <> 'object' or coalesce(new.choc ->> 's', '0') !~ '^[0-9]{1,3}$' or coalesce(new.choc ->> 'l', '0') !~ '^[0-4]$'
       or coalesce(new.choc ->> 'm', '') !~ '^([0-9]{4}-[0-9]{2})?$' then new.choc := null;
    else new.choc := jsonb_build_object('s', coalesce((new.choc ->> 's')::int, 0), 'l', coalesce((new.choc ->> 'l')::int, 0), 'm', coalesce(new.choc ->> 'm', ''));
    end if;
  end if;
  -- v904 : plateaux et dos des mini-jeux : seulement ces cinq clés (v907 : eb), chacune une clé simple de sa famille
  if new.boards is not null then
    if jsonb_typeof(new.boards) <> 'object' then new.boards := null;
    else new.boards := jsonb_strip_nulls(jsonb_build_object(
      'mat', case when new.boards ->> 'mat' ~ '^tp-[a-z0-9-]{1,40}$' then new.boards ->> 'mat' end,
      'pb', case when new.boards ->> 'pb' ~ '^pp-[a-z0-9-]{1,40}$' then new.boards ->> 'pb' end,
      'cb', case when new.boards ->> 'cb' ~ '^cp-[a-z0-9-]{1,40}$' then new.boards ->> 'cb' end,
      'cd', case when new.boards ->> 'cd' ~ '^cd-[a-z0-9-]{1,40}$' then new.boards ->> 'cd' end,
      'eb', case when new.boards ->> 'eb' ~ '^ep-[a-z0-9-]{1,40}$' then new.boards ->> 'eb' end)); -- v907 : salle des Enchères
    end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_cosm_check on public.profiles;
create trigger profiles_cosm_check before insert or update on public.profiles for each row execute function public.profiles_cosm_check();

-- le serveur de partie publie le cadre et la plaque avec le profil (même fonction que dans 12-serveur-de-partie.sql)
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
    -- v807 : série et ligue du Choc des Boosters (vues par l'adversaire)
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'choc') then
      execute 'update public.profiles set choc = $2 where id = $1' using p_uid, p_profile -> 'choc';
    end if;
    -- v904 : plateaux et dos des mini-jeux (vus par l'adversaire en ligne)
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'boards') then
      execute 'update public.profiles set boards = $2 where id = $1' using p_uid, p_profile -> 'boards';
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
revoke execute on function public.partie_publish(uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.partie_publish(uuid, jsonb, jsonb, jsonb) to service_role;


-- ABYSSAL:empreinte (écrite par tools/sql-stamp.mjs, ne pas modifier)
create table if not exists public.sql_stamps (file text primary key, stamp text not null, at timestamptz not null default now());
alter table public.sql_stamps enable row level security;
revoke all on public.sql_stamps from public, anon, authenticated;
insert into public.sql_stamps (file, stamp) values ('15', '057431de049c') on conflict (file) do update set stamp = excluded.stamp, at = now();
create or replace function public.sql_stamps() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(file, stamp), '{}'::jsonb) from public.sql_stamps;
$$;
revoke execute on function public.sql_stamps() from public, anon;
grant execute on function public.sql_stamps() to authenticated;
-- ABYSSAL:fin

-- Vérification
select 'cadres et plaques visibles par tous' as etat;
