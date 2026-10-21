-- ABYSSAL v538 : contrôles du serveur contre la triche (demande du propriétaire du 21 octobre 2026).
-- À coller dans Supabase → SQL Editor → New query → Run (après 01 à 10). Se recolle sans danger.
-- Généré par `node tools/anti-triche-sql.mjs` (titres et cartes lus dans le jeu) : à regénérer et recoller
-- quand on ajoute des cartes ou des titres.
--
-- Ce que le serveur vérifie désormais :
--   1. Profil public : un titre inventé (ou insultant) est refusé, le portrait doit être une vraie carte,
--      le nombre de créatures ne dépasse pas le nombre de cartes du jeu.
--   2. Classement des Épreuves : chaque Épreuve gagnée est envoyée une seule fois (au plus 3 par jour) et
--      c'est le serveur qui fait le total (au plus 200 points par Épreuve). L'ancien envoi d'un total
--      (submit_score) est retiré : il acceptait n'importe quel nombre.

-- ——— 1. Profils ————————————————————————————————————————————————————————
create table if not exists public.game_titles (name text primary key);
create table if not exists public.game_cards (id text primary key);
alter table public.game_titles enable row level security;
alter table public.game_cards enable row level security;
revoke all on public.game_titles, public.game_cards from anon, authenticated;
insert into public.game_titles (name) values
--TITRES--
on conflict do nothing;
insert into public.game_cards (id) values
--CARTES--
on conflict do nothing;

create or replace function public.profiles_sane()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.title is not null and not exists (select 1 from public.game_titles where name = new.title) then new.title := null; end if;
  if new.avatar is not null and not exists (select 1 from public.game_cards where id = new.avatar) then new.avatar := null; end if;
  new.owned := greatest(0, least(coalesce(new.owned, 0), (select count(*) from public.game_cards)::int));
  new.level := greatest(1, least(coalesce(new.level, 1), 999));
  return new;
end $$;
drop trigger if exists profiles_sane on public.profiles;
create trigger profiles_sane before insert or update on public.profiles
  for each row execute function public.profiles_sane();

-- ——— 2. Épreuves du jour ——————————————————————————————————————————————
create table if not exists public.trial_wins (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  idx int not null check (idx between 0 and 2),
  hp int not null check (hp between 0 and 100),
  at timestamptz not null default now(),
  primary key (user_id, day, idx)
);
alter table public.trial_wins enable row level security;
revoke all on public.trial_wins from anon, authenticated;

-- le total d'une journée parfaite (3 × 200) dépassait l'ancienne limite de 500 : le score était refusé
alter table public.descent_scores drop constraint if exists descent_scores_floor_check;
alter table public.descent_scores add constraint descent_scores_floor_check check (floor between 0 and 600);

create or replace function public.trial_win(p_day date, p_idx int, p_hp int)
returns int language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); total int;
begin
  if me is null then raise exception 'Non connecté'; end if;
  if p_day < current_date - 1 or p_day > current_date + 1 then raise exception 'Jour invalide'; end if;
  if p_idx is null or p_idx not between 0 and 2 then raise exception 'Épreuve inconnue'; end if;
  if not exists (select 1 from public.profiles where id = me) then raise exception 'Choisis d’abord ton pseudo.'; end if;
  -- un combat dure bien plus de 20 secondes : deux victoires plus rapprochées viennent d'une app modifiée
  if exists (select 1 from public.trial_wins where user_id = me and day = p_day and at > now() - interval '20 seconds') then
    raise exception 'Trop rapide.';
  end if;
  insert into public.trial_wins (user_id, day, idx, hp) values (me, p_day, p_idx, greatest(0, least(100, coalesce(p_hp, 0))))
  on conflict do nothing; -- une Épreuve ne compte qu'une fois
  select sum(100 + hp) into total from public.trial_wins where user_id = me and day = p_day;
  insert into public.descent_scores (user_id, day, floor, cursed) values (me, p_day, total, false)
  on conflict (user_id, day) do update set floor = excluded.floor, updated_at = now();
  return total;
end $$;
revoke execute on function public.trial_win(date, int, int) from public, anon;
grant execute on function public.trial_win(date, int, int) to authenticated;

drop function if exists public.submit_score(date, int, boolean);

-- les profils déjà enregistrés passent par les mêmes contrôles
update public.profiles set title = null where title is not null and title not in (select name from public.game_titles);
update public.profiles set avatar = null where avatar is not null and avatar not in (select id from public.game_cards);
update public.profiles set owned = least(owned, (select count(*) from public.game_cards)::int), level = greatest(1, least(level, 999));

-- Vérification
select (select count(*) from public.game_titles) as titres, (select count(*) from public.game_cards) as cartes, 'contrôles prêts' as etat;
