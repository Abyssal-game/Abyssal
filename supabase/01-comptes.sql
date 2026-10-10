-- ABYSSAL · étape 1 : profils, sauvegardes en ligne, classement de la Descente.
-- À coller dans Supabase : SQL Editor → New query → Run. Peut être relancé sans risque.

-- Profils publics (pseudo, avatar, titre)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  pseudo text not null check (char_length(pseudo) between 3 and 16 and pseudo ~ '^[[:alnum:]_ -]+$'),
  avatar text,
  title text,
  level int not null default 1,
  owned int not null default 0,
  updated_at timestamptz not null default now()
);
create unique index if not exists profiles_pseudo_key on public.profiles (lower(pseudo));

-- Sauvegarde complète de chaque joueur (lisible et modifiable par lui seul)
create table if not exists public.saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Meilleur étage de la Descente, par joueur et par jour
create table if not exists public.descent_scores (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  floor int not null check (floor between 0 and 500),
  cursed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
create index if not exists descent_scores_day on public.descent_scores (day, floor desc);

-- Sécurité : chaque table est fermée, puis on ouvre le strict nécessaire.
alter table public.profiles enable row level security;
alter table public.saves enable row level security;
alter table public.descent_scores enable row level security;

drop policy if exists "profils lisibles" on public.profiles;
create policy "profils lisibles" on public.profiles for select to authenticated using (true);
drop policy if exists "mon profil (création)" on public.profiles;
create policy "mon profil (création)" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "mon profil (modification)" on public.profiles;
create policy "mon profil (modification)" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "ma sauvegarde (lecture)" on public.saves;
create policy "ma sauvegarde (lecture)" on public.saves for select to authenticated using (user_id = auth.uid());
drop policy if exists "ma sauvegarde (création)" on public.saves;
create policy "ma sauvegarde (création)" on public.saves for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "ma sauvegarde (modification)" on public.saves;
create policy "ma sauvegarde (modification)" on public.saves for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "classement lisible" on public.descent_scores;
create policy "classement lisible" on public.descent_scores for select to authenticated using (true);

revoke all on public.profiles, public.saves, public.descent_scores from anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.saves to authenticated;
grant select on public.descent_scores to authenticated;

-- Envoi d'un score : on ne garde que le meilleur étage du jour (le jour doit être aujourd'hui, à un jour près).
create or replace function public.submit_score(p_day date, p_floor int, p_cursed boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  if p_day < current_date - 1 or p_day > current_date + 1 then raise exception 'Jour invalide'; end if;
  insert into public.descent_scores (user_id, day, floor, cursed)
  values (auth.uid(), p_day, p_floor, p_cursed)
  on conflict (user_id, day) do update
    set cursed = case when excluded.floor > descent_scores.floor then excluded.cursed else descent_scores.cursed end,
        floor = greatest(descent_scores.floor, excluded.floor),
        updated_at = now();
end $$;
revoke execute on function public.submit_score(date, int, boolean) from public, anon;
grant execute on function public.submit_score(date, int, boolean) to authenticated;

-- Suppression de son propre compte (RGPD) : profil, sauvegarde et scores partent avec.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
