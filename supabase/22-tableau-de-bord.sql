-- ABYSSAL v917 : tableau de bord du créateur (demande du propriétaire du 30 octobre 2026 : savoir où les joueurs s'arrêtent).
-- À coller dans Supabase → SQL Editor → New query → Run (après 12-serveur-de-partie.sql et 17-notifications.sql).
-- Se recolle sans danger.
--
-- Une seule fonction, lisible seulement par un compte au badge « createur » : elle compte, sans rien renvoyer de
-- personnel (ni e-mail, ni pseudo), combien de comptes ont franchi chaque étape du jeu, et combien reviennent.
-- Tout vient de nos propres tables (comptes, parties tenues par le serveur, téléphones des notifications) :
-- aucun pistage, aucun service extérieur. Les comptes au badge « createur » ne sont pas comptés.

create or replace function public.createur_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  r jsonb;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and badge = 'createur') then
    raise exception 'Réservé au créateur.' using errcode = '42501';
  end if;
  with u as (
    select a.id, a.created_at, p.data, p.updated_at as seen
    from auth.users a
    left join public.parties p on p.user_id = a.id
    where not exists (select 1 from public.profiles x where x.id = a.id and x.badge = 'createur')
  ), f as (
    select id, created_at, seen,
      coalesce((data->'stats'->>'boosters')::int, 0) as boosters,
      coalesce((data->'descent'->>'best')::int, 0) as best,
      coalesce((select count(*) from jsonb_object_keys(case when jsonb_typeof(data->'bossesBeaten') = 'object' then data->'bossesBeaten' else '{}'::jsonb end)), 0) as bosses,
      coalesce((data->'stats'->>'daily')::int, 0) as days,
      (coalesce((data->'sceaux'->>'wins')::int, 0) + coalesce((data->'sceaux'->>'losses')::int, 0)
        + coalesce((data->'pacte'->>'wins')::int, 0) + coalesce((data->'pacte'->>'losses')::int, 0)
        + coalesce((data->'cryptes'->>'wins')::int, 0) + coalesce((data->'cryptes'->>'losses')::int, 0)
        + coalesce((data->'encheres'->>'wins')::int, 0) + coalesce((data->'encheres'->>'losses')::int, 0)) as cercle,
      coalesce((data->'versus'->>'played')::int, 0) as choc,
      data is not null as has_data
    from u
  )
  select jsonb_build_object(
    'at', now(),
    'comptes', (select count(*) from f),
    'nouveaux', jsonb_build_object(
      'jour', (select count(*) from f where created_at > now() - interval '1 day'),
      'semaine', (select count(*) from f where created_at > now() - interval '7 days'),
      'mois', (select count(*) from f where created_at > now() - interval '30 days')),
    'actifs', jsonb_build_object(
      'jour', (select count(*) from f where seen > now() - interval '1 day'),
      'semaine', (select count(*) from f where seen > now() - interval '7 days'),
      'mois', (select count(*) from f where seen > now() - interval '30 days')),
    'etapes', jsonb_build_array(
      jsonb_build_object('k', 'compte', 'n', (select count(*) from f)),
      jsonb_build_object('k', 'partie', 'n', (select count(*) from f where has_data)),
      jsonb_build_object('k', 'booster', 'n', (select count(*) from f where boosters > 0)),
      jsonb_build_object('k', 'etage1', 'n', (select count(*) from f where best >= 1)),
      jsonb_build_object('k', 'gardien', 'n', (select count(*) from f where bosses >= 1)),
      jsonb_build_object('k', 'etage10', 'n', (select count(*) from f where best >= 10)),
      jsonb_build_object('k', 'etage25', 'n', (select count(*) from f where best >= 25)),
      jsonb_build_object('k', 'etage50', 'n', (select count(*) from f where best >= 50)),
      jsonb_build_object('k', 'etage100', 'n', (select count(*) from f where best >= 100))),
    'jeux', jsonb_build_object(
      'cercle', (select count(*) from f where cercle > 0),
      'choc', (select count(*) from f where choc > 0)),
    /* retour : parmi les comptes assez anciens, part de ceux qui ont joué au moins 2 (puis 7) jours différents */
    'retour', jsonb_build_object(
      'j1_base', (select count(*) from f where created_at < now() - interval '2 days'),
      'j1', (select count(*) from f where created_at < now() - interval '2 days' and days >= 2),
      'j7_base', (select count(*) from f where created_at < now() - interval '8 days'),
      'j7', (select count(*) from f where created_at < now() - interval '8 days' and days >= 7),
      'actif7_base', (select count(*) from f where created_at < now() - interval '7 days'),
      'actif7', (select count(*) from f where created_at < now() - interval '7 days' and seen > now() - interval '7 days')),
    'jours', (select coalesce(jsonb_agg(jsonb_build_object('d', d::date, 'n', n) order by d), '[]'::jsonb) from (
      select date_trunc('day', g) as d, (select count(*) from f where date_trunc('day', created_at) = date_trunc('day', g)) as n
      from generate_series(now() - interval '13 days', now(), interval '1 day') g) z),
    'telephones', (select coalesce(jsonb_object_agg(platform, n), '{}'::jsonb) from (
      select t.platform, count(distinct t.user_id) as n from public.push_tokens t group by t.platform) z)
  ) into r;
  return r;
end $$;
revoke execute on function public.createur_stats() from public, anon;
grant execute on function public.createur_stats() to authenticated;


-- ABYSSAL:empreinte (écrite par tools/sql-stamp.mjs, ne pas modifier)
create table if not exists public.sql_stamps (file text primary key, stamp text not null, at timestamptz not null default now());
alter table public.sql_stamps enable row level security;
revoke all on public.sql_stamps from public, anon, authenticated;
insert into public.sql_stamps (file, stamp) values ('22', 'de66d14d05c3') on conflict (file) do update set stamp = excluded.stamp, at = now();
create or replace function public.sql_stamps() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(file, stamp), '{}'::jsonb) from public.sql_stamps;
$$;
revoke execute on function public.sql_stamps() from public, anon;
grant execute on function public.sql_stamps() to authenticated;
-- ABYSSAL:fin

-- Vérification : la fonction est installée (le résultat ne s'affiche qu'au compte créateur, dans le jeu)
select 'tableau de bord prêt' as etat;
