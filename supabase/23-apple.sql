-- ABYSSAL v925 : « Continuer avec Apple » et la suppression du compte (règle 5.1.1(v) d'Apple).
-- À coller dans Supabase → SQL Editor → New query → Run. Se recolle sans danger.
--
-- Le jeton de renouvellement donné par Apple à la connexion, gardé pour pouvoir le rendre à Apple quand le joueur
-- supprime son compte. Seule la fonction serveur « apple » (clé secrète) le lit et l'écrit : aucun joueur n'y a accès.
-- Supprimer le compte efface aussi la ligne (on delete cascade), après que la fonction l'a rendue à Apple.

create table if not exists public.apple_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  updated_at timestamptz not null default now()
);
alter table public.apple_tokens enable row level security;
revoke all on public.apple_tokens from public, anon, authenticated;
grant select, insert, update, delete on public.apple_tokens to service_role;


-- ABYSSAL:empreinte (écrite par tools/sql-stamp.mjs, ne pas modifier)
create table if not exists public.sql_stamps (file text primary key, stamp text not null, at timestamptz not null default now());
alter table public.sql_stamps enable row level security;
revoke all on public.sql_stamps from public, anon, authenticated;
insert into public.sql_stamps (file, stamp) values ('23', '5a2e93e60c14') on conflict (file) do update set stamp = excluded.stamp, at = now();
create or replace function public.sql_stamps() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(file, stamp), '{}'::jsonb) from public.sql_stamps;
$$;
revoke execute on function public.sql_stamps() from public, anon;
grant execute on function public.sql_stamps() to authenticated;
-- ABYSSAL:fin

-- Vérification
select 'jetons Apple prêts' as etat;
