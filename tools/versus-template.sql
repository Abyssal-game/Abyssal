-- ABYSSAL · étape 8 : Versus Booster (défis de boosters entre joueurs). v516 : composition libre des boosters.
-- À coller dans Supabase : SQL Editor → New query → Run. Peut être relancé sans risque.
-- Fichier généré par `node tools/versus-sql.mjs` (cartes et probabilités lues dans le jeu) : à relancer
-- quand des cartes sont ajoutées, puis recoller le fichier dans Supabase.
--
-- Un joueur lance un défi : type de booster (standard, faction, alliances, premium) et nombre (1 à 3).
-- Défi ouvert à tous, ou envoyé à un ami. Celui qui le relève paie la même mise : le serveur ouvre alors
-- les boosters des deux joueurs (impossible à truquer depuis le téléphone) et compte les points
-- (Commune 1, Peu commune 2, Rare 6, Hyper rare 20, Mythique 80, Secrète 200, +8 par finition).
-- Le meilleur total remporte toutes les cartes ; égalité : chacun garde les cartes de ses boosters.
-- Un défi non relevé en 48 h expire ; annulé, refusé ou expiré, la mise est rendue au créateur.
-- Les éclats sont tenus par le jeu (sauvegarde) ; le serveur tient les défis, les tirages et les gains.

-- ——— Cartes (même table que le Tirage des Ombres) ————————————————————————
create table if not exists public.shadow_cards (
  id text primary key,
  rarity text not null,
  faction text not null,
  variants text[] not null default '{}'
);
alter table public.shadow_cards enable row level security;
revoke all on public.shadow_cards from anon, authenticated;
insert into public.shadow_cards (id, rarity, faction, variants) values
--CARTES--
on conflict (id) do update set rarity = excluded.rarity, faction = excluded.faction, variants = excluded.variants;

-- ——— Défis ————————————————————————————————————————————————————————————
create table if not exists public.versus_duels (
  id uuid primary key default gen_random_uuid(),
  a uuid not null references public.profiles(id) on delete cascade,      -- celui qui lance le défi
  b uuid references public.profiles(id) on delete cascade,               -- l'ami défié, ou celui qui relève
  public boolean not null default true,
  type text not null check (type in ('standard', 'faction', 'event', 'premium')),
  faction text,
  factions text[],
  packs int not null check (packs between 1 and 3),
  stake int not null,                                                    -- éclats misés par chaque joueur
  status text not null default 'open' check (status in ('open', 'done', 'cancelled', 'declined', 'expired')),
  a_cards jsonb, b_cards jsonb, a_score int, b_score int,
  a_claimed boolean not null default false,
  b_claimed boolean not null default false,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
-- v516 : composition libre (jusqu'à 3 boosters de types différents, les mêmes pour les deux joueurs)
alter table public.versus_duels add column if not exists lineup jsonb;
alter table public.versus_duels drop constraint if exists versus_duels_type_check;
alter table public.versus_duels add constraint versus_duels_type_check check (type in ('standard', 'faction', 'event', 'premium', 'mix'));
create index if not exists versus_open on public.versus_duels (status, created_at desc);
create index if not exists versus_a on public.versus_duels (a, created_at desc);
create index if not exists versus_b on public.versus_duels (b, created_at desc);
alter table public.versus_duels enable row level security;
revoke all on public.versus_duels from anon, authenticated;

-- ——— Tirage d'un booster (mêmes tables que le jeu, sans garantie de pitié) ———————————
create or replace function public.versus_rarity(p_table text)
returns text language plpgsql volatile set search_path = public as $$
declare w jsonb; k text; tot float8 := 0; x float8;
begin
  w := case p_table
--POIDS--
  end;
  for k in select unnest(array['C','PC','R','HR','M','S']) loop tot := tot + coalesce((w ->> k)::float8, 0); end loop;
  x := random() * tot;
  for k in select unnest(array['C','PC','R','HR','M','S']) loop
    if w ? k then
      if x < (w ->> k)::float8 then return k; end if;
      x := x - (w ->> k)::float8;
    end if;
  end loop;
  return 'S';
end $$;

create or replace function public.versus_pack(p_type text, p_faction text, p_factions text[])
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  slots text[]; mult float8; slot text; r text; i int; c public.shadow_cards%rowtype; v text; x float8; pts int; out jsonb := '[]'::jsonb;
  ord text[] := array['C','PC','R','HR','M','S'];
begin
  case p_type
--BOOSTERS--
    else raise exception 'Booster inconnu.';
  end case;
  foreach slot in array slots loop
    r := public.versus_rarity(slot);
    c.id := null;
    i := array_position(ord, r);
    while i >= 1 and c.id is null loop
      select * into c from public.shadow_cards s
        where s.rarity = ord[i]
          and (p_type not in ('faction') or s.faction = p_faction)
          and (p_type <> 'event' or s.faction = any(p_factions))
        order by random() limit 1;
      i := i - 1;
    end loop;
    if c.id is null then raise exception 'Aucune carte à tirer.'; end if;
    x := random() * 100; v := 'normal';
--FINITIONS--
    pts := case c.rarity --POINTS-- end + case when v = 'normal' then 0 else --PTVAR-- end;
    out := out || jsonb_build_object('id', c.id, 'rarity', c.rarity, 'variant', v, 'pts', pts);
  end loop;
  return out;
end $$;
revoke execute on function public.versus_rarity(text) from public, anon, authenticated;
revoke execute on function public.versus_pack(text, text, text[]) from public, anon, authenticated;

create or replace function public.versus_score(p jsonb)
returns int language sql immutable as $$ select coalesce(sum((e ->> 'pts')::int), 0)::int from jsonb_array_elements(p) e $$;

-- Défis ouverts depuis plus de 48 h : expirés (mise rendue au créateur à sa prochaine visite)
create or replace function public.versus_expire()
returns void language sql volatile security definer set search_path = public as $$
  update public.versus_duels set status = 'expired' where status = 'open' and created_at < now() - interval '48 hours';
$$;
revoke execute on function public.versus_expire() from public, anon, authenticated;

-- ——— Lancer un défi : renvoie son identifiant ————————————————————————————
create or replace function public.versus_create(p_type text, p_faction text, p_factions text[], p_packs int, p_to uuid default null)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); n int; price int; id uuid;
  facs text[] := array['infernal','abyssal','celeste','sauvage','necrotique','primordial','artificiel'];
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  if not exists (select 1 from public.profiles where profiles.id = me) then raise exception 'Choisis d’abord ton pseudo (Sanctuaire → Compte).'; end if;
  if p_packs is null or p_packs < 1 or p_packs > 3 then raise exception 'De 1 à 3 boosters par défi.'; end if;
  price := case p_type --PRIX-- else null end;
  if price is null then raise exception 'Booster inconnu.'; end if;
  if p_type = 'faction' and (p_faction is null or not (p_faction = any(facs))) then raise exception 'Choisis une faction.'; end if;
  if p_type = 'event' and (coalesce(array_length(p_factions, 1), 0) <> 2 or not (p_factions <@ facs) or p_factions[1] = p_factions[2]) then raise exception 'Alliance inconnue.'; end if;
  if p_to is not null then
    if p_to = me then raise exception 'Tu ne peux pas te défier toi-même.'; end if;
    if not public.are_friends(me, p_to) then raise exception 'Ce joueur n’est pas ton ami.'; end if;
  end if;
  perform public.versus_expire();
  select count(*) into n from public.versus_duels where a = me and status = 'open';
  if n >= 5 then raise exception 'Tu as déjà 5 défis en attente : attends qu’on les relève ou annule-en un.'; end if;
  insert into public.versus_duels (a, b, public, type, faction, factions, packs, stake)
  values (me, p_to, p_to is null, p_type, case when p_type = 'faction' then p_faction end, case when p_type = 'event' then p_factions end, p_packs, price * p_packs)
  returning versus_duels.id into id;
  return id;
end $$;

-- ——— v516 : lancer un défi à composition libre : p_lineup = [{type, faction?, factions?}, …] (1 à 3 boosters) ——————
create or replace function public.versus_create_mix(p_lineup jsonb, p_to uuid default null)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); n int; price int := 0; p int; id uuid; it record; ty text; fa text; fs text[]; clean jsonb := '[]'::jsonb; types text[] := '{}';
  facs text[] := array['infernal','abyssal','celeste','sauvage','necrotique','primordial','artificiel'];
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  if not exists (select 1 from public.profiles where profiles.id = me) then raise exception 'Choisis d’abord ton pseudo (Sanctuaire → Compte).'; end if;
  if jsonb_typeof(p_lineup) <> 'array' or jsonb_array_length(p_lineup) < 1 or jsonb_array_length(p_lineup) > 3 then raise exception 'De 1 à 3 boosters par défi.'; end if;
  for it in select * from jsonb_array_elements(p_lineup) loop
    ty := it.value ->> 'type'; fa := null; fs := null;
    p := case ty --PRIX-- else null end;
    if p is null then raise exception 'Booster inconnu.'; end if;
    if ty = 'faction' then
      fa := it.value ->> 'faction';
      if fa is null or not (fa = any(facs)) then raise exception 'Choisis une faction.'; end if;
    end if;
    if ty = 'event' then
      fs := array(select jsonb_array_elements_text(coalesce(it.value -> 'factions', '[]'::jsonb)));
      if coalesce(array_length(fs, 1), 0) <> 2 or not (fs <@ facs) or fs[1] = fs[2] then raise exception 'Alliance inconnue.'; end if;
    end if;
    price := price + p; types := types || ty;
    clean := clean || jsonb_strip_nulls(jsonb_build_object('type', ty, 'faction', fa, 'factions', to_jsonb(fs)));
  end loop;
  if p_to is not null then
    if p_to = me then raise exception 'Tu ne peux pas te défier toi-même.'; end if;
    if not public.are_friends(me, p_to) then raise exception 'Ce joueur n’est pas ton ami.'; end if;
  end if;
  perform public.versus_expire();
  select count(*) into n from public.versus_duels where a = me and status = 'open';
  if n >= 5 then raise exception 'Tu as déjà 5 défis en attente : attends qu’on les relève ou annule-en un.'; end if;
  insert into public.versus_duels (a, b, public, type, packs, stake, lineup)
  values (me, p_to, p_to is null, case when (select count(distinct x) from unnest(types) x) = 1 then types[1] else 'mix' end, jsonb_array_length(clean), price, clean)
  returning versus_duels.id into id;
  return id;
end $$;
revoke execute on function public.versus_create_mix(jsonb, uuid) from public, anon;
grant execute on function public.versus_create_mix(jsonb, uuid) to authenticated;

-- ——— Relever un défi : le serveur ouvre les boosters des deux joueurs ——————————————
create or replace function public.versus_accept(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); d public.versus_duels; ca jsonb := '[]'::jsonb; cb jsonb := '[]'::jsonb; k int; it record;
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  if not exists (select 1 from public.profiles where profiles.id = me) then raise exception 'Choisis d’abord ton pseudo (Sanctuaire → Compte).'; end if;
  perform public.versus_expire();
  select * into d from public.versus_duels where id = p_id for update;
  if not found or d.status <> 'open' then raise exception 'Ce défi n’est plus disponible.'; end if;
  if d.a = me then raise exception 'C’est ton propre défi.'; end if;
  if d.b is not null and d.b <> me then raise exception 'Ce défi est réservé à un autre joueur.'; end if;
  if d.lineup is not null then
    for it in select * from jsonb_array_elements(d.lineup) loop
      ca := ca || public.versus_pack(it.value ->> 'type', it.value ->> 'faction', array(select jsonb_array_elements_text(coalesce(it.value -> 'factions', '[]'::jsonb))));
      cb := cb || public.versus_pack(it.value ->> 'type', it.value ->> 'faction', array(select jsonb_array_elements_text(coalesce(it.value -> 'factions', '[]'::jsonb))));
    end loop;
  else
    for k in 1..d.packs loop
      ca := ca || public.versus_pack(d.type, d.faction, d.factions);
      cb := cb || public.versus_pack(d.type, d.faction, d.factions);
    end loop;
  end if;
  update public.versus_duels set b = me, status = 'done', a_cards = ca, b_cards = cb,
    a_score = public.versus_score(ca), b_score = public.versus_score(cb), done_at = now()
  where id = p_id;
  return jsonb_build_object('id', p_id, 'stake', d.stake);
end $$;

-- ——— Annuler (créateur) ou refuser (ami défié) un défi encore ouvert ———————————————
create or replace function public.versus_cancel(p_id uuid)
returns text language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  update public.versus_duels set status = 'cancelled' where id = p_id and a = me and status = 'open';
  if found then return 'cancelled'; end if;
  update public.versus_duels set status = 'declined' where id = p_id and b = me and not public and status = 'open';
  if found then return 'declined'; end if;
  raise exception 'Ce défi n’est plus ouvert.';
end $$;

-- ——— Encaisser un défi (une seule fois par joueur) ————————————————————————————
-- Renvoie { result: 'win' | 'tie' | 'lose' | 'refund' | 'already' | 'wait', cards: [...] } : cartes à ajouter,
-- éclats à rendre (refund = la mise du créateur).
create or replace function public.versus_claim(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); d public.versus_duels; mine int; theirs int; res text; cards jsonb := '[]'::jsonb; trophy jsonb; chest text;
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  perform public.versus_expire();
  select * into d from public.versus_duels where id = p_id and me in (a, b) for update;
  if not found then raise exception 'Défi introuvable.'; end if;
  if (d.a = me and d.a_claimed) or (d.b = me and d.a <> me and d.b_claimed) then
    return jsonb_build_object('result', 'already', 'cards', '[]'::jsonb, 'stake', d.stake);
  end if;
  if d.status = 'open' then return jsonb_build_object('result', 'wait', 'cards', '[]'::jsonb, 'stake', d.stake); end if;
  if d.status in ('cancelled', 'declined', 'expired') then
    if d.a <> me then return jsonb_build_object('result', 'already', 'cards', '[]'::jsonb, 'stake', d.stake); end if;
    update public.versus_duels set a_claimed = true where id = p_id;
    return jsonb_build_object('result', 'refund', 'cards', '[]'::jsonb, 'stake', d.stake);
  end if;
  -- v735 : plus de mise. Chacun garde les cartes de ses propres boosters ; le gagnant reçoit en plus une copie de la
  -- plus belle carte de l'adversaire (le jeu donne un coffre abyssal à la place d'une Mythique ou d'une Secrète)
  if d.a = me then mine := d.a_score; theirs := d.b_score; else mine := d.b_score; theirs := d.a_score; end if;
  cards := coalesce(case when d.a = me then d.a_cards else d.b_cards end, '[]'::jsonb);
  if mine > theirs then
    res := 'win';
    select x into trophy from jsonb_array_elements(case when d.a = me then d.b_cards else d.a_cards end) x
      order by (x->>'pts')::int desc, array_position(array['C','PC','R','HR','M','S'], x->>'rarity') desc nulls last limit 1;
    if trophy is not null and trophy->>'rarity' in ('M', 'S') then chest := 'abyssal'; trophy := null; end if;
  elsif mine = theirs then res := 'tie';
  else res := 'lose'; end if;
  if d.a = me then update public.versus_duels set a_claimed = true where id = p_id;
  else update public.versus_duels set b_claimed = true where id = p_id; end if;
  return jsonb_build_object('result', res, 'cards', cards, 'stake', d.stake, 'trophy', trophy, 'chest', chest,
    'packs', greatest(1, coalesce(jsonb_array_length(d.lineup), d.packs, 1)));
end $$;

-- ——— Listes : défis ouverts des autres, et mes défis (30 derniers) ————————————————————
-- v565 : apparence de l'adversaire (sachet de booster, cadre, plaque : colonnes aussi créées par 15-vitrine.sql)
alter table public.profiles add column if not exists frame text;
alter table public.profiles add column if not exists plate text;
alter table public.profiles add column if not exists sachet text;
create or replace function public.versus_list()
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  perform public.versus_expire();
  return jsonb_build_object(
    'open', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select d.id, d.a, d.type, d.faction, d.factions, d.lineup, d.packs, d.stake, d.created_at, p.pseudo, p.avatar, p.badge, p.title, p.level
      from public.versus_duels d join public.profiles p on p.id = d.a
      where d.status = 'open' and d.public and d.a <> me
      order by d.created_at desc limit 40) x), '[]'::jsonb),
    'mine', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select d.id, d.a, d.b, d.public, d.type, d.faction, d.factions, d.lineup, d.packs, d.stake, d.status, d.created_at, d.done_at,
             (d.a = me) as mine,
             case when d.a = me then d.a_cards else d.b_cards end as my_cards,
             case when d.a = me then d.b_cards else d.a_cards end as their_cards,
             case when d.a = me then d.a_score else d.b_score end as my_score,
             case when d.a = me then d.b_score else d.a_score end as their_score,
             case when d.a = me then d.a_claimed else d.b_claimed end as claimed,
             o.pseudo, o.avatar, o.badge, o.sachet, o.frame, o.plate
      from public.versus_duels d left join public.profiles o on o.id = case when d.a = me then d.b else d.a end
      where me in (d.a, d.b)
      order by d.created_at desc limit 30) x), '[]'::jsonb));
end $$;

revoke execute on function public.versus_create(text, text, text[], int, uuid) from public, anon;
revoke execute on function public.versus_accept(uuid) from public, anon;
revoke execute on function public.versus_cancel(uuid) from public, anon;
revoke execute on function public.versus_claim(uuid) from public, anon;
revoke execute on function public.versus_list() from public, anon;
grant execute on function public.versus_create(text, text, text[], int, uuid) to authenticated;
grant execute on function public.versus_accept(uuid) to authenticated;
grant execute on function public.versus_cancel(uuid) to authenticated;
grant execute on function public.versus_claim(uuid) to authenticated;
grant execute on function public.versus_list() to authenticated;

-- Vérification : nombre de cartes tirables et de défis
select (select count(*) from public.shadow_cards) as cartes, (select count(*) from public.versus_duels) as defis;
