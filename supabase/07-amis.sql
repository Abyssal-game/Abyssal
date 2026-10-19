-- ABYSSAL · étape 7 : amis et pseudo définitif.
-- À coller dans Supabase : SQL Editor → New query → Run. Peut être relancé sans risque.
--
-- 1. Pseudo définitif : une fois choisi, un joueur ne peut plus le changer lui-même. Seule exception : un pseudo
--    masqué après 3 signalements (« Joueur-xxxxxxxx ») ; le joueur en choisit alors un nouveau, une fois.
-- 2. Amis : demandes d'ami par pseudo, acceptation ou refus, retrait.
-- 3. Fiche d'ami : un résumé de la partie (collection, succès, statistiques), lisible par soi et par ses amis seulement.

-- ——— 1. Pseudo définitif ——————————————————————————————————————————————
alter table public.profiles add column if not exists pseudo_locked boolean not null default false;

-- pseudo déjà masqué pour ce joueur (lu par le serveur : la table des signalements est fermée)
create or replace function public.pseudo_flagged(p_id uuid, p_pseudo text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pseudo_reports r where r.target = p_id and lower(r.pseudo) = lower(p_pseudo)
                 group by r.pseudo having count(distinct r.reporter) >= 3);
$$;
revoke execute on function public.pseudo_flagged(uuid, text) from public, anon;
grant execute on function public.pseudo_flagged(uuid, text) to authenticated;

create or replace function public.profiles_pseudo_check()
returns trigger language plpgsql set search_path = public as $$
declare masked boolean := new.pseudo ~ '^Joueur-[0-9a-f]{8}$';
begin
  if tg_op = 'UPDATE' and new.pseudo is not distinct from old.pseudo then return new; end if;
  if current_user = 'authenticated' then
    -- changement demandé par le joueur lui-même
    if masked then raise exception 'Ce pseudo est réservé. Choisis-en un autre.'; end if;
    if tg_op = 'UPDATE' and old.pseudo_locked then raise exception 'Ton pseudo est définitif.'; end if;
    if not public.pseudo_ok(new.pseudo) then raise exception 'Ce pseudo n’est pas accepté. Choisis-en un autre.'; end if;
    if public.pseudo_flagged(new.id, new.pseudo) then
      raise exception 'Ce pseudo a été signalé par plusieurs joueurs. Choisis-en un autre.';
    end if;
    new.pseudo_locked := true;
  elsif masked then
    -- masquage par le serveur (signalements) : le joueur pourra choisir un nouveau pseudo
    new.pseudo_locked := false;
  end if;
  return new;
end $$;
drop trigger if exists profiles_pseudo_check on public.profiles;
create trigger profiles_pseudo_check before insert or update of pseudo on public.profiles
  for each row execute function public.profiles_pseudo_check();

-- les pseudos déjà choisis deviennent définitifs
update public.profiles set pseudo_locked = true where not pseudo_locked and pseudo !~ '^Joueur-[0-9a-f]{8}$';

-- ——— 2. Amis ————————————————————————————————————————————————————————
-- a = celui qui demande, b = celui qui reçoit ; une seule ligne par paire de joueurs.
create table if not exists public.friendships (
  a uuid not null references public.profiles(id) on delete cascade,
  b uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a <> b)
);
create unique index if not exists friendships_pair on public.friendships (least(a, b), greatest(a, b));
create index if not exists friendships_b on public.friendships (b);
alter table public.friendships enable row level security;
drop policy if exists "mes liens d'amitié" on public.friendships;
create policy "mes liens d'amitié" on public.friendships for select to authenticated using (auth.uid() in (a, b));
revoke all on public.friendships from anon, authenticated;
grant select on public.friendships to authenticated;

create or replace function public.are_friends(x uuid, y uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.friendships f where f.status = 'accepted'
                 and ((f.a = x and f.b = y) or (f.a = y and f.b = x)));
$$;

-- Demande d'ami par pseudo. Renvoie 'sent' (demande envoyée), 'accepted' (il t'avait déjà demandé : vous êtes amis),
-- 'pending' (demande déjà envoyée) ou 'already' (déjà amis).
create or replace function public.friend_request(p_pseudo text)
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); other uuid; row public.friendships; n int;
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  if not exists (select 1 from public.profiles where id = me) then raise exception 'Choisis d’abord ton pseudo (Sanctuaire → Compte).'; end if;
  select id into other from public.profiles where lower(pseudo) = lower(trim(p_pseudo));
  if other is null then raise exception 'Aucun joueur ne porte ce pseudo.'; end if;
  if other = me then raise exception 'C’est ton propre pseudo !'; end if;
  select * into row from public.friendships where (a = me and b = other) or (a = other and b = me);
  if found then
    if row.status = 'accepted' then return 'already'; end if;
    if row.a = me then return 'pending'; end if;
    update public.friendships set status = 'accepted' where a = other and b = me;
    return 'accepted';
  end if;
  select count(*) into n from public.friendships where a = me and status = 'pending';
  if n >= 50 then raise exception 'Trop de demandes en attente : attends qu’on te réponde.'; end if;
  select count(*) into n from public.friendships where status = 'accepted' and me in (a, b);
  if n >= 200 then raise exception 'Tu as déjà 200 amis.'; end if;
  insert into public.friendships (a, b) values (me, other);
  return 'sent';
end $$;

-- Réponse à une demande reçue
create or replace function public.friend_respond(p_other uuid, p_accept boolean)
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  if p_accept then
    update public.friendships set status = 'accepted' where a = p_other and b = me and status = 'pending';
    if not found then raise exception 'Cette demande n’existe plus.'; end if;
    return 'accepted';
  end if;
  delete from public.friendships where a = p_other and b = me and status = 'pending';
  return 'refused';
end $$;

-- Retirer un ami, ou annuler une demande envoyée
create or replace function public.friend_remove(p_other uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  delete from public.friendships where (a = me and b = p_other) or (a = p_other and b = me);
end $$;

-- Mes amis et mes demandes (reçues : incoming = true ; envoyées : incoming = false)
create or replace function public.friend_list()
returns table (id uuid, pseudo text, avatar text, title text, level int, owned int, badge text, status text, incoming boolean, since timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.pseudo, p.avatar, p.title, p.level, p.owned, p.badge, f.status, (f.b = auth.uid()) as incoming, f.created_at
  from public.friendships f
  join public.profiles p on p.id = case when f.a = auth.uid() then f.b else f.a end
  where auth.uid() in (f.a, f.b)
  order by f.status desc, lower(p.pseudo);
$$;

revoke execute on function public.are_friends(uuid, uuid) from public, anon;
revoke execute on function public.friend_request(text) from public, anon;
revoke execute on function public.friend_respond(uuid, boolean) from public, anon;
revoke execute on function public.friend_remove(uuid) from public, anon;
revoke execute on function public.friend_list() from public, anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;
grant execute on function public.friend_request(text) to authenticated;
grant execute on function public.friend_respond(uuid, boolean) to authenticated;
grant execute on function public.friend_remove(uuid) to authenticated;
grant execute on function public.friend_list() to authenticated;

-- ——— 3. Fiche d'ami ——————————————————————————————————————————————————
-- Résumé publié par le jeu (collection, succès, statistiques), jamais la sauvegarde complète.
create table if not exists public.player_cards (
  id uuid primary key references public.profiles(id) on delete cascade,
  data jsonb not null check (octet_length(data::text) < 100000),
  updated_at timestamptz not null default now()
);
alter table public.player_cards enable row level security;
drop policy if exists "fiche lisible par moi et mes amis" on public.player_cards;
create policy "fiche lisible par moi et mes amis" on public.player_cards for select to authenticated
  using (id = auth.uid() or public.are_friends(auth.uid(), id));
drop policy if exists "ma fiche (création)" on public.player_cards;
create policy "ma fiche (création)" on public.player_cards for insert to authenticated with check (id = auth.uid());
drop policy if exists "ma fiche (modification)" on public.player_cards;
create policy "ma fiche (modification)" on public.player_cards for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke all on public.player_cards from anon, authenticated;
grant select, insert, update on public.player_cards to authenticated;

-- Vérification : nombre de pseudos définitifs et de liens d'amitié
select (select count(*) from public.profiles where pseudo_locked) as pseudos_definitifs,
       (select count(*) from public.friendships) as liens_amitie;
