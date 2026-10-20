-- ABYSSAL · étape 9 : mini-jeux contre d'autres joueurs (Duels des Sceaux, Pacte, Enchères en ligne ; Cryptes entre amis).
-- À coller dans Supabase : SQL Editor → New query → Run. Peut être relancé sans risque.
-- Fichier généré par `node tools/mp-sql.mjs` (valeurs des cartes lues dans le jeu) : à relancer quand des cartes
-- sont ajoutées, puis recoller le fichier dans Supabase.
--
-- Deux vitesses : partie lente (chacun joue quand il veut, --HEURES-- h par coup) ou rapide (--SECONDES-- s par coup).
-- Un coup pas joué à temps : la partie est perdue. C'est le serveur qui tient la partie et applique les règles :
-- personne ne peut tricher sur un coup. Partie rapide contre un joueur au hasard, ou défi envoyé à un ami.

-- ——— Valeurs des cartes aux Sceaux (haut, droite, bas, gauche ; total 20) ——————————————
create table if not exists public.sceaux_cards (
  id text primary key,
  rarity text not null,
  v int[] not null
);
alter table public.sceaux_cards enable row level security;
revoke all on public.sceaux_cards from anon, authenticated;
insert into public.sceaux_cards (id, rarity, v) values
--CARTES--
on conflict (id) do update set rarity = excluded.rarity, v = excluded.v;

-- ——— Parties ————————————————————————————————————————————————————————
create table if not exists public.mp_matches (
  id uuid primary key default gen_random_uuid(),
  game text not null check (game in ('sceaux')),
  a uuid not null references public.profiles(id) on delete cascade,   -- celui qui crée la partie
  b uuid references public.profiles(id) on delete cascade,            -- son adversaire
  public boolean not null default true,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'done', 'cancelled')),
  turn text check (turn in ('a', 'b')),
  deadline timestamptz,
  state jsonb not null default '{}'::jsonb,
  winner text check (winner in ('a', 'b', 'draw')),
  reason text,
  a_claimed boolean not null default false,
  b_claimed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mp_matches_wait on public.mp_matches (game, status, created_at);
create index if not exists mp_matches_a on public.mp_matches (a, updated_at desc);
create index if not exists mp_matches_b on public.mp_matches (b, updated_at desc);
alter table public.mp_matches enable row level security;
revoke all on public.mp_matches from anon, authenticated;
-- v523 : le Pacte se joue aussi en ligne
alter table public.mp_matches drop constraint if exists mp_matches_game_check;
alter table public.mp_matches add constraint mp_matches_game_check check (game in ('sceaux', 'pacte', 'encheres', 'cryptes'));
-- v525 : aux Enchères, les deux joueurs misent en même temps : turn = 'ab' tant qu'aucun n'a misé
alter table public.mp_matches drop constraint if exists mp_matches_turn_check;
alter table public.mp_matches add constraint mp_matches_turn_check check (turn in ('a', 'b', 'ab'));

create or replace function public.mp_hours() returns int language sql immutable as $$ select --HEURES-- $$;
-- v522 : deux vitesses. Lente : --HEURES-- h par coup ; rapide : --SECONDES-- s par coup (les deux joueurs connectés),
-- plus 3 s de marge pour le réseau, et 15 s de plus pour le tout premier coup (le temps d'arriver sur la partie).
alter table public.mp_matches add column if not exists pace text not null default 'slow';
alter table public.mp_matches drop constraint if exists mp_matches_pace_check;
alter table public.mp_matches add constraint mp_matches_pace_check check (pace in ('fast', 'slow'));
create or replace function public.mp_delay(p_pace text, p_first boolean default false) returns interval language sql immutable as $$
  select case when p_pace = 'fast' then make_interval(secs => --SECONDES-- + 3 + case when p_first then 15 else 0 end) else make_interval(hours => --HEURES--) end
$$;

-- Parties en attente depuis plus de 24 h : annulées ; coup pas joué dans le délai : perdue pour celui qui devait jouer
create or replace function public.mp_expire()
returns void language sql volatile security definer set search_path = public as $$
  update public.mp_matches set status = 'cancelled', updated_at = now() where status = 'waiting' and created_at < now() - case when pace = 'fast' then interval '5 minutes' else interval '24 hours' end;
  update public.mp_matches set status = 'done', winner = case when turn = 'a' then 'b' when turn = 'b' then 'a' else 'draw' end, reason = 'timeout', updated_at = now()
    where status = 'playing' and deadline < now();
$$;
revoke execute on function public.mp_expire() from public, anon, authenticated;

-- ——— Règles des Sceaux (même moteur que js/core/sceaux.js) ————————————————————————
create or replace function public.sc_nb(i int, d int) returns int language sql immutable as $$
  select case d when 0 then case when i >= 3 then i - 3 else -1 end
                when 1 then case when i % 3 < 2 then i + 1 else -1 end
                when 2 then case when i < 6 then i + 3 else -1 end
                else case when i % 3 > 0 then i - 1 else -1 end end
$$;

-- Applique une pose (main du joueur who, index idx, case cell) à l'état de la partie. Lève une erreur si le coup est interdit.
create or replace function public.sceaux_apply(st jsonb, who text, idx int, cell int)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  board jsonb := st -> 'board'; hand jsonb := st -> 'hands' -> who; rule text := st ->> 'rule';
  cid text; card record; vals int[]; m int; fury boolean; guard boolean;
  held int[] := '{}'; flips int[] := '{}'; chain int[] := '{}'; spec int[] := '{}';
  d int; n int; o jsonb; mine int; theirs int; opp int[] := array[2, 3, 0, 1];
  nb int[] := '{}'; nmine int[] := '{}'; ntheirs int[] := '{}';
  s int; k int; c int; src jsonb; sums int[] := '{}'; sarr int[] := '{}'; placed int; ca int := 0; cb int := 0; heart text; other text;
begin
  if who not in ('a', 'b') then raise exception 'Joueur inconnu.'; end if;
  if cell is null or cell < 0 or cell > 8 or (board -> cell) <> 'null'::jsonb then raise exception 'Cette case est déjà prise.'; end if;
  if idx is null or idx < 0 or idx >= jsonb_array_length(hand) then raise exception 'Carte introuvable.'; end if;
  cid := hand ->> idx;
  select * into card from public.sceaux_cards where id = cid;
  if not found then raise exception 'Carte inconnue : %', cid; end if;
  m := case when cell = (st -> 'cells' ->> 'blessed')::int then 1 when cell = (st -> 'cells' ->> 'cursed')::int then -1 else 0 end;
  vals := array[greatest(1, least(10, card.v[1] + m)), greatest(1, least(10, card.v[2] + m)), greatest(1, least(10, card.v[3] + m)), greatest(1, least(10, card.v[4] + m))];
  guard := card.rarity in ('HR', 'S');
  fury := card.rarity in ('M', 'S');
  hand := hand - idx;
  board := jsonb_set(board, array[cell::text], jsonb_build_object('id', cid, 'o', who, 'v', to_jsonb(vals), 'g', guard));
  -- voisines occupées, dans l'ordre haut, droite, bas, gauche
  for d in 0..3 loop
    n := public.sc_nb(cell, d);
    if n >= 0 and (board -> n) <> 'null'::jsonb then
      nb := nb || n; nmine := nmine || vals[d + 1]; ntheirs := ntheirs || ((board -> n -> 'v') ->> opp[d + 1])::int;
    end if;
  end loop;
  -- Identique : deux égalités ou plus
  if rule = 'identique' then
    k := 0; for s in 1..coalesce(array_length(nb, 1), 0) loop if nmine[s] = ntheirs[s] then k := k + 1; end if; end loop;
    if k >= 2 then for s in 1..array_length(nb, 1) loop if nmine[s] = ntheirs[s] then spec := spec || nb[s]; end if; end loop; end if;
  end if;
  -- Somme : deux voisines ou plus avec la même somme (sommes prises dans l'ordre croissant, comme le moteur du jeu)
  if rule = 'somme' and coalesce(array_length(nb, 1), 0) >= 2 then
    for s in 1..array_length(nb, 1) loop sarr := sarr || (nmine[s] + ntheirs[s]); end loop;
    select array_agg(distinct x order by x) into sums from unnest(sarr) x;
    foreach k in array sums loop
      c := 0; for s in 1..array_length(nb, 1) loop if nmine[s] + ntheirs[s] = k then c := c + 1; end if; end loop;
      if c >= 2 then for s in 1..array_length(nb, 1) loop if nmine[s] + ntheirs[s] = k and not (nb[s] = any(spec)) then spec := spec || nb[s]; end if; end loop; end if;
    end loop;
  end if;
  -- captures des règles spéciales
  for s in 1..coalesce(array_length(spec, 1), 0) loop
    n := spec[s]; o := board -> n;
    if o ->> 'o' <> who then
      if n = any(held) then null;
      elsif (o ->> 'g')::boolean then board := jsonb_set(board, array[n::text, 'g'], 'false'); held := held || n;
      else board := jsonb_set(board, array[n::text, 'o'], to_jsonb(who)); flips := flips || n; chain := chain || n; end if;
    end if;
  end loop;
  -- capture simple
  for s in 1..coalesce(array_length(nb, 1), 0) loop
    n := nb[s]; o := board -> n;
    if o ->> 'o' <> who and (nmine[s] > ntheirs[s] or (fury and nmine[s] = ntheirs[s])) then
      if n = any(held) then null;
      elsif (o ->> 'g')::boolean then board := jsonb_set(board, array[n::text, 'g'], 'false'); held := held || n;
      else board := jsonb_set(board, array[n::text, 'o'], to_jsonb(who)); flips := flips || n; end if;
    end if;
  end loop;
  -- Combo : chaque carte prise par Identique ou Somme capture à son tour, en cascade
  while coalesce(array_length(chain, 1), 0) > 0 loop
    c := chain[1]; chain := chain[2:]; src := board -> c;
    for d in 0..3 loop
      n := public.sc_nb(c, d);
      if n >= 0 and (board -> n) <> 'null'::jsonb then
        o := board -> n;
        if o ->> 'o' <> who and ((src -> 'v') ->> d)::int > ((o -> 'v') ->> opp[d + 1])::int then
          if n = any(held) then null;
          elsif (o ->> 'g')::boolean then board := jsonb_set(board, array[n::text, 'g'], 'false'); held := held || n;
          else board := jsonb_set(board, array[n::text, 'o'], to_jsonb(who)); flips := flips || n; chain := chain || n; end if;
        end if;
      end if;
    end loop;
  end loop;
  placed := coalesce((st ->> 'placed')::int, 0) + 1;
  other := case when who = 'a' then 'b' else 'a' end;
  st := jsonb_set(st, '{board}', board);
  st := jsonb_set(st, array['hands', who], hand);
  st := jsonb_set(st, '{placed}', to_jsonb(placed));
  st := jsonb_set(st, '{last}', jsonb_build_object('who', who, 'id', cid, 'cell', cell, 'flips', to_jsonb(flips), 'blocked', to_jsonb(held)));
  st := jsonb_set(st, '{log}', coalesce(st -> 'log', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('who', who, 'id', cid, 'cell', cell, 'flips', to_jsonb(flips))));
  if placed >= 9 then
    ca := jsonb_array_length(st -> 'hands' -> 'a'); cb := jsonb_array_length(st -> 'hands' -> 'b');
    for s in 0..8 loop if (board -> s ->> 'o') = 'a' then ca := ca + 1; elsif (board -> s ->> 'o') = 'b' then cb := cb + 1; end if; end loop;
    heart := board -> 4 ->> 'o';
    st := st || jsonb_build_object('over', true, 'final', jsonb_build_object('a', ca, 'b', cb),
      'winner', case when ca > cb then 'a' when cb > ca then 'b' when heart is not null then heart else 'draw' end);
  else
    st := jsonb_set(st, '{turn}', to_jsonb(other));
  end if;
  return st;
end $$;
revoke execute on function public.sceaux_apply(jsonb, text, int, int) from public, anon, authenticated;

-- Main de 5 cartes connues du jeu, sans doublon
create or replace function public.sceaux_hand_ok(h text[]) returns boolean language sql stable set search_path = public as $$
  select coalesce(array_length(h, 1), 0) = 5 and (select count(distinct x) from unnest(h) x) = 5
    and (select count(*) from public.sceaux_cards c where c.id = any(h)) = 5
$$;

-- Début de partie : règle tirée au hasard, cases sacrées, premier joueur au hasard
create or replace function public.sceaux_start(p_id uuid, hb text[])
returns void language plpgsql volatile security definer set search_path = public as $$
declare d public.mp_matches; rule text; c1 int; c2 int; first text;
begin
  select * into d from public.mp_matches where id = p_id for update;
  rule := (array['classique', 'sacre', 'identique', 'somme'])[1 + floor(random() * 4)::int];
  c1 := null; c2 := null;
  if rule = 'sacre' then c1 := floor(random() * 9)::int; c2 := floor(random() * 8)::int; if c2 >= c1 then c2 := c2 + 1; end if; end if;
  first := case when random() < 0.5 then 'a' else 'b' end;
  update public.mp_matches set status = 'playing', turn = first, deadline = now() + public.mp_delay(d.pace, true), updated_at = now(),
    state = jsonb_build_object('rule', rule, 'board', jsonb_build_array(null, null, null, null, null, null, null, null, null),
      'hands', jsonb_build_object('a', d.state -> 'handA', 'b', to_jsonb(hb)), 'cells', jsonb_build_object('blessed', c1, 'cursed', c2),
      'placed', 0, 'turn', first, 'first', first, 'log', '[]'::jsonb)
  where id = p_id;
end $$;
revoke execute on function public.sceaux_start(uuid, text[]) from public, anon, authenticated;

-- ——— Partie rapide (contre un joueur au hasard) ou défi à un ami ————————————————————————
drop function if exists public.sceaux_mp_new(text[], uuid);
create or replace function public.sceaux_mp_new(p_hand text[], p_to uuid default null, p_pace text default 'slow')
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); m public.mp_matches; id uuid; n int;
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  if not exists (select 1 from public.profiles where profiles.id = me) then raise exception 'Choisis d’abord ton pseudo (Sanctuaire → Compte).'; end if;
  if not public.sceaux_hand_ok(p_hand) then raise exception 'Ta main doit compter 5 cartes différentes.'; end if;
  if p_pace is null or p_pace not in ('fast', 'slow') then raise exception 'Vitesse inconnue.'; end if;
  perform public.mp_expire();
  select count(*) into n from public.mp_matches where me in (a, b) and status in ('waiting', 'playing');
  if n >= 10 then raise exception 'Tu as déjà 10 parties en cours : termine-en une d’abord.'; end if;
  if p_to is null then
    -- un joueur attend déjà ? on le rejoint
    select * into m from public.mp_matches where game = 'sceaux' and status = 'waiting' and public and b is null and a <> me and pace = p_pace
      order by created_at limit 1 for update skip locked;
    if found then
      update public.mp_matches set b = me where mp_matches.id = m.id;
      perform public.sceaux_start(m.id, p_hand);
      return m.id;
    end if;
    if exists (select 1 from public.mp_matches where game = 'sceaux' and status = 'waiting' and public and a = me and pace = p_pace) then
      raise exception 'Tu cherches déjà un adversaire : ta partie commencera dès qu’un joueur arrive.';
    end if;
  else
    if p_to = me then raise exception 'Tu ne peux pas te défier toi-même.'; end if;
    if not public.are_friends(me, p_to) then raise exception 'Ce joueur n’est pas ton ami.'; end if;
  end if;
  insert into public.mp_matches (game, a, b, public, pace, state) values ('sceaux', me, p_to, p_to is null, p_pace, jsonb_build_object('handA', to_jsonb(p_hand)))
  returning mp_matches.id into id;
  return id;
end $$;

-- L'ami défié accepte, avec sa main
create or replace function public.sceaux_mp_join(p_id uuid, p_hand text[])
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); m public.mp_matches;
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  if not public.sceaux_hand_ok(p_hand) then raise exception 'Ta main doit compter 5 cartes différentes.'; end if;
  perform public.mp_expire();
  select * into m from public.mp_matches where id = p_id and game = 'sceaux' for update; -- v527 : seulement une partie des Sceaux
  if not found or m.status <> 'waiting' or m.b is distinct from me or m.public then raise exception 'Cette partie n’est plus disponible.'; end if;
  perform public.sceaux_start(p_id, p_hand);
  return p_id;
end $$;

-- Jouer un coup
create or replace function public.sceaux_mp_play(p_id uuid, p_idx int, p_cell int)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); m public.mp_matches; who text; st jsonb;
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  perform public.mp_expire();
  select * into m from public.mp_matches where id = p_id and game = 'sceaux' and me in (a, b) for update;
  if not found then raise exception 'Partie introuvable.'; end if;
  if m.status <> 'playing' then raise exception 'Cette partie est terminée.'; end if;
  who := case when m.a = me then 'a' else 'b' end;
  if m.turn <> who then raise exception 'Ce n’est pas ton tour.'; end if;
  st := public.sceaux_apply(m.state, who, p_idx, p_cell);
  if (st ->> 'over')::boolean then
    update public.mp_matches set state = st, status = 'done', winner = st ->> 'winner', reason = 'score', turn = null, deadline = null, updated_at = now() where id = p_id;
  else
    update public.mp_matches set state = st, turn = st ->> 'turn', deadline = now() + public.mp_delay(m.pace), updated_at = now() where id = p_id;
  end if;
  return public.mp_view(p_id);
end $$;

-- ——— Le Pacte en ligne (même moteur que js/core/pacte.js) ————————————————————————————
-- Paquet : 7 factions × valeurs 1 à 7, 3 Sceaux, 3 Gardiens, 3 Offrandes, mélangé par le serveur.
-- Le paquet reste caché : la vue d'une partie le renvoie trié (on peut compter les cartes restantes, pas leur ordre).
create or replace function public.pacte_deck() returns jsonb language sql volatile as $$
  select jsonb_agg(x order by random()) from (
    select jsonb_build_object('f', f, 'v', v) as x from unnest(array['infernal', 'abyssal', 'celeste', 'sauvage', 'necrotique', 'primordial', 'artificiel']) f, generate_series(1, 7) v
    union all select jsonb_build_object('sp', k) from unnest(array['sceau', 'gardien', 'offrande']) k, generate_series(1, 3)
  ) d
$$;
revoke execute on function public.pacte_deck() from public, anon, authenticated;
create or replace function public.pacte_row_value(r jsonb) returns int language sql immutable as $$
  select coalesce(sum((x ->> 'v')::int * case when (x ->> 'x2')::boolean then 2 else 1 end), 0)::int from jsonb_array_elements(r) x where x ? 'f'
$$;

-- Applique une action ('draw' ou 'stop') du joueur who ('a' ou 'b') ; renvoie le nouvel état (last = l'événement, over = fin)
create or replace function public.pacte_apply(st jsonb, who text, act text)
returns jsonb language plpgsql volatile set search_path = public as $$
declare c jsonb; r jsonb; ev jsonb; res text := 'ok'; gain int := 0; lost int := 0; x2 boolean := false; ending boolean := false; bonus boolean := false;
  fs text[]; i int; other text := case when who = 'a' then 'b' else 'a' end; sa int; sb int; tg int; n int;
begin
  if (st ->> 'over') is not null then raise exception 'Cette partie est terminée.'; end if;
  if st ->> 'turn' <> who then raise exception 'Ce n’est pas ton tour.'; end if;
  r := st -> 'row';
  select coalesce(array_agg(x ->> 'f'), '{}') into fs from jsonb_array_elements(r) x where x ? 'f';
  if act = 'stop' then
    if coalesce(array_length(fs, 1), 0) = 0 then raise exception 'Tire au moins une carte de faction avant de t’arrêter.'; end if;
    res := 'stop'; ending := true;
  elsif act = 'draw' then
    if jsonb_array_length(st -> 'deck') = 0 then
      -- paquet vide : la défausse est mélangée
      st := jsonb_set(jsonb_set(st, '{deck}', coalesce((select jsonb_agg(x order by random()) from jsonb_array_elements(st -> 'discard') x), '[]')), '{discard}', '[]');
      st := jsonb_set(st, '{shuf}', to_jsonb(coalesce((st ->> 'shuf')::int, 0) + 1));
    end if;
    c := st -> 'deck' -> -1;
    st := jsonb_set(st, '{deck}', (st -> 'deck') - (-1));
    if c ->> 'sp' = 'sceau' then
      st := jsonb_set(st, '{sceaux}', to_jsonb((st ->> 'sceaux')::int + 1)); r := r || jsonb_build_array(c);
    elsif c ->> 'sp' = 'offrande' then
      st := jsonb_set(st, '{offer}', 'true'); r := r || jsonb_build_array(c);
    elsif c ->> 'sp' = 'gardien' then
      r := r || jsonb_build_array(c); res := 'forced'; ending := true;
    elsif (c ->> 'f') = any(fs) then
      if (st ->> 'sceaux')::int > 0 then
        res := 'saved';
        st := jsonb_set(st, '{sceaux}', to_jsonb((st ->> 'sceaux')::int - 1));
        select min(o) - 1 into i from jsonb_array_elements(r) with ordinality e(x, o) where x ->> 'sp' = 'sceau';
        if i is not null then st := jsonb_set(st, '{discard}', (st -> 'discard') || jsonb_build_array(r -> i)); r := r - i; end if;
        st := jsonb_set(st, '{discard}', (st -> 'discard') || jsonb_build_array(c));
        st := jsonb_set(st, '{offer}', 'false');
      else
        lost := public.pacte_row_value(r);
        r := r || jsonb_build_array(c); res := 'bust'; ending := true;
        st := jsonb_set(st, array['stats', 'busts', who], to_jsonb((st #>> array['stats', 'busts', who])::int + 1));
      end if;
    else
      x2 := (st ->> 'offer')::boolean;
      st := jsonb_set(st, '{offer}', 'false');
      r := r || jsonb_build_array(case when x2 then c || '{"x2": true}' else c end);
      if coalesce(array_length(fs, 1), 0) + 1 = 7 then res := 'seven'; ending := true; bonus := true; end if;
    end if;
  else
    raise exception 'Action inconnue.';
  end if;
  st := jsonb_set(st, '{row}', r);
  -- encaisser (arrêt, Gardien, sept factions)
  if res in ('stop', 'forced', 'seven') then
    gain := public.pacte_row_value(r) + case when bonus then (st ->> 'seven')::int else 0 end;
    st := jsonb_set(st, array['scores', who], to_jsonb((st #>> array['scores', who])::int + gain));
    st := jsonb_set(st, array['stats', 'best', who], to_jsonb(greatest((st #>> array['stats', 'best', who])::int, gain)));
    if bonus then st := jsonb_set(st, array['stats', 'sevens', who], to_jsonb((st #>> array['stats', 'sevens', who])::int + 1)); end if;
  end if;
  n := coalesce((st ->> 'n')::int, 0) + 1;
  ev := jsonb_build_object('n', n, 'who', who, 'result', res, 'gain', gain);
  if c is not null then ev := ev || jsonb_build_object('card', c); end if;
  if x2 then ev := ev || '{"x2": true}'; end if;
  if res = 'bust' then ev := ev || jsonb_build_object('lost', lost); end if;
  st := st || jsonb_build_object('n', n, 'last', ev);
  st := jsonb_set(st, '{log}', (select coalesce(jsonb_agg(x order by o), '[]') from (select x, o from jsonb_array_elements(coalesce(st -> 'log', '[]') || jsonb_build_array(ev)) with ordinality e(x, o) order by o desc limit 16) z));
  -- fin du tour : la rangée part à la défausse, et le tour complet se termine quand le second joueur a joué
  if ending then
    st := jsonb_set(st, '{discard}', (st -> 'discard') || coalesce((select jsonb_agg(x - 'x2' order by o) from jsonb_array_elements(r) with ordinality e(x, o)), '[]'));
    st := st || jsonb_build_object('row', '[]'::jsonb, 'sceaux', 0, 'offer', false);
    st := jsonb_set(st, array['turns', who], to_jsonb((st #>> array['turns', who])::int + 1));
    if who <> st ->> 'first' then
      sa := (st #>> '{scores,a}')::int; sb := (st #>> '{scores,b}')::int; tg := (st ->> 'target')::int;
      if (sa >= tg or sb >= tg) and sa <> sb then
        return st || jsonb_build_object('over', true, 'winner', case when sa > sb then 'a' else 'b' end, 'final', jsonb_build_object('a', sa, 'b', sb), 'turn', null);
      end if;
      st := jsonb_set(st, '{round}', to_jsonb((st ->> 'round')::int + 1));
    end if;
    st := jsonb_set(st, '{turn}', to_jsonb(other));
  end if;
  return st;
end $$;
revoke execute on function public.pacte_apply(jsonb, text, text) from public, anon, authenticated;

create or replace function public.pacte_start(p_id uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
declare d public.mp_matches; first text := case when random() < 0.5 then 'a' else 'b' end;
begin
  select * into d from public.mp_matches where id = p_id for update;
  update public.mp_matches set status = 'playing', turn = first, deadline = now() + public.mp_delay(d.pace, true), updated_at = now(),
    state = jsonb_build_object('deck', public.pacte_deck(), 'discard', '[]'::jsonb, 'shuf', 0, 'scores', jsonb_build_object('a', 0, 'b', 0),
      'row', '[]'::jsonb, 'sceaux', 0, 'offer', false, 'turns', jsonb_build_object('a', 0, 'b', 0), 'first', first, 'turn', first, 'round', 1,
      'target', 60, 'seven', 15, 'n', 0, 'log', '[]'::jsonb,
      'stats', jsonb_build_object('busts', jsonb_build_object('a', 0, 'b', 0), 'best', jsonb_build_object('a', 0, 'b', 0), 'sevens', jsonb_build_object('a', 0, 'b', 0)))
  where id = p_id;
end $$;
revoke execute on function public.pacte_start(uuid) from public, anon, authenticated;

-- Partie rapide (contre un joueur au hasard de la même vitesse) ou défi à un ami
create or replace function public.pacte_mp_new(p_to uuid default null, p_pace text default 'slow')
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); m public.mp_matches; id uuid; n int;
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  if not exists (select 1 from public.profiles where profiles.id = me) then raise exception 'Choisis d’abord ton pseudo (Sanctuaire → Compte).'; end if;
  if p_pace is null or p_pace not in ('fast', 'slow') then raise exception 'Vitesse inconnue.'; end if;
  perform public.mp_expire();
  select count(*) into n from public.mp_matches where me in (a, b) and status in ('waiting', 'playing');
  if n >= 10 then raise exception 'Tu as déjà 10 parties en cours : termine-en une d’abord.'; end if;
  if p_to is null then
    select * into m from public.mp_matches where game = 'pacte' and status = 'waiting' and public and b is null and a <> me and pace = p_pace
      order by created_at limit 1 for update skip locked;
    if found then
      update public.mp_matches set b = me where mp_matches.id = m.id;
      perform public.pacte_start(m.id);
      return m.id;
    end if;
    if exists (select 1 from public.mp_matches where game = 'pacte' and status = 'waiting' and public and a = me and pace = p_pace) then
      raise exception 'Tu cherches déjà un adversaire : ta partie commencera dès qu’un joueur arrive.';
    end if;
  else
    if p_to = me then raise exception 'Tu ne peux pas te défier toi-même.'; end if;
    if not public.are_friends(me, p_to) then raise exception 'Ce joueur n’est pas ton ami.'; end if;
  end if;
  insert into public.mp_matches (game, a, b, public, pace, state) values ('pacte', me, p_to, p_to is null, p_pace, '{}'::jsonb)
  returning mp_matches.id into id;
  return id;
end $$;

create or replace function public.pacte_mp_join(p_id uuid)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); m public.mp_matches;
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  perform public.mp_expire();
  select * into m from public.mp_matches where id = p_id and game = 'pacte' for update;
  if not found or m.status <> 'waiting' or m.b is distinct from me or m.public then raise exception 'Cette partie n’est plus disponible.'; end if;
  perform public.pacte_start(p_id);
  return p_id;
end $$;

-- Tirer une carte ('draw') ou s'arrêter ('stop')
create or replace function public.pacte_mp_act(p_id uuid, p_action text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); m public.mp_matches; who text; st jsonb;
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  perform public.mp_expire();
  select * into m from public.mp_matches where id = p_id and game = 'pacte' and me in (a, b) for update;
  if not found then raise exception 'Partie introuvable.'; end if;
  if m.status <> 'playing' then raise exception 'Cette partie est terminée.'; end if;
  who := case when m.a = me then 'a' else 'b' end;
  if m.turn <> who then raise exception 'Ce n’est pas ton tour.'; end if;
  st := public.pacte_apply(m.state, who, p_action);
  if (st ->> 'over')::boolean then
    update public.mp_matches set state = st, status = 'done', winner = st ->> 'winner', reason = 'score', turn = null, deadline = null, updated_at = now() where id = p_id;
  else
    update public.mp_matches set state = st, turn = st ->> 'turn', deadline = now() + public.mp_delay(m.pace), updated_at = now() where id = p_id;
  end if;
  return public.mp_view(p_id);
end $$;

-- ——— v525 : Les Enchères en ligne (à deux, même moteur que js/core/encheres.js) ——————————————————
-- 15 lots : 10 créatures (1 à 10, quatre factions : 3, 3, 2, 2) et 5 malédictions (−1 à −5), dans un ordre caché.
-- Les deux joueurs posent une offrande (1 à 15) en secret ; deux offrandes égales s'annulent et le lot reste sur la table.
-- Sinon la plus haute prend une créature (lot positif), la plus basse prend une malédiction. Famille de trois : +5.
create or replace function public.encheres_lots() returns jsonb language sql volatile as $$
  with f as (select x, row_number() over (order by random()) r from unnest(array['infernal', 'abyssal', 'celeste', 'sauvage', 'necrotique', 'primordial', 'artificiel']) x),
  pat as (select x, row_number() over (order by random()) n from f, generate_series(1, case when r <= 2 then 3 else 2 end) where r <= 4)
  select jsonb_agg(l order by random()) from (
    select jsonb_build_object('v', n, 'f', x) l from pat
    union all select jsonb_build_object('v', -k, 'f', null) from generate_series(1, 5) k
  ) z
$$;
revoke execute on function public.encheres_lots() from public, anon, authenticated;
create or replace function public.encheres_score(won jsonb, bonus int) returns int language sql immutable as $$
  select coalesce((select sum((x ->> 'v')::int) from jsonb_array_elements(won) x), 0)::int
    + bonus * coalesce((select sum(n / 3) from (select count(*)::int n from jsonb_array_elements(won) x where x ->> 'f' is not null group by x ->> 'f') c), 0)::int
$$;
create or replace function public.encheres_apply(st jsonb, who text, offer int)
returns jsonb language plpgsql volatile set search_path = public as $$
declare ba int; bb int; lot jsonb; pile jsonb; val int; taker text; ev jsonb; n int; sa int; sb int; ka int[]; kb int[];
begin
  if (st ->> 'over') is not null then raise exception 'Cette vente est terminée.'; end if;
  if offer is null or not ((st -> 'offers' -> who) @> to_jsonb(offer)) then raise exception 'Offrande déjà jouée.'; end if;
  if (st -> 'bids' ->> who) is not null then raise exception 'Tu as déjà posé ton offrande.'; end if;
  st := jsonb_set(st, array['bids', who], to_jsonb(offer));
  if (st -> 'bids' ->> 'a') is null or (st -> 'bids' ->> 'b') is null then
    return st || jsonb_build_object('turn', case when who = 'a' then 'b' else 'a' end);
  end if;
  -- les deux offrandes sont posées : on révèle
  ba := (st -> 'bids' ->> 'a')::int; bb := (st -> 'bids' ->> 'b')::int;
  lot := st -> 'lots' -> ((st ->> 'i')::int);
  pile := (st -> 'pot') || jsonb_build_array(lot);
  select coalesce(sum((x ->> 'v')::int), 0) into val from jsonb_array_elements(pile) x;
  st := jsonb_set(st, '{offers,a}', coalesce((select jsonb_agg(x) from jsonb_array_elements(st -> 'offers' -> 'a') x where x::int <> ba), '[]'));
  st := jsonb_set(st, '{offers,b}', coalesce((select jsonb_agg(x) from jsonb_array_elements(st -> 'offers' -> 'b') x where x::int <> bb), '[]'));
  if ba = bb then taker := null;
  elsif val > 0 then taker := case when ba > bb then 'a' else 'b' end;
  else taker := case when ba < bb then 'a' else 'b' end;
  end if;
  if taker is not null then
    st := jsonb_set(st, array['won', taker], (st -> 'won' -> taker) || pile);
    st := jsonb_set(st, '{pot}', '[]');
  else
    st := jsonb_set(st, '{pot}', pile);
  end if;
  n := coalesce((st ->> 'n')::int, 0) + 1;
  ev := jsonb_build_object('n', n, 'i', (st ->> 'i')::int, 'lot', lot, 'pile', pile, 'value', val, 'bids', jsonb_build_object('a', ba, 'b', bb), 'taker', taker, 'cancelled', ba = bb);
  st := st || jsonb_build_object('n', n, 'last', ev, 'i', (st ->> 'i')::int + 1, 'bids', jsonb_build_object('a', null, 'b', null), 'turn', 'ab');
  st := jsonb_set(st, '{log}', (select coalesce(jsonb_agg(x order by o), '[]') from (select x, o from jsonb_array_elements(coalesce(st -> 'log', '[]') || jsonb_build_array(ev)) with ordinality e(x, o) order by o desc limit 15) z));
  if (st ->> 'i')::int >= jsonb_array_length(st -> 'lots') then
    sa := public.encheres_score(st -> 'won' -> 'a', (st ->> 'setBonus')::int); sb := public.encheres_score(st -> 'won' -> 'b', (st ->> 'setBonus')::int);
    -- départage : le plus de points, puis le plus de créatures, puis la plus belle créature
    ka := array[sa, (select count(*)::int from jsonb_array_elements(st -> 'won' -> 'a') x where (x ->> 'v')::int > 0), coalesce((select max((x ->> 'v')::int) from jsonb_array_elements(st -> 'won' -> 'a') x), 0)];
    kb := array[sb, (select count(*)::int from jsonb_array_elements(st -> 'won' -> 'b') x where (x ->> 'v')::int > 0), coalesce((select max((x ->> 'v')::int) from jsonb_array_elements(st -> 'won' -> 'b') x), 0)];
    return st || jsonb_build_object('over', true, 'turn', null, 'winner', case when ka > kb then 'a' when kb > ka then 'b' else 'draw' end, 'final', jsonb_build_object('a', sa, 'b', sb));
  end if;
  return st;
end $$;
revoke execute on function public.encheres_apply(jsonb, text, int) from public, anon, authenticated;
create or replace function public.encheres_init() returns jsonb language sql volatile as $$
  select jsonb_build_object('lots', public.encheres_lots(), 'i', 0, 'pot', '[]'::jsonb, 'setBonus', 5, 'n', 0, 'log', '[]'::jsonb, 'turn', 'ab',
    'offers', jsonb_build_object('a', (select jsonb_agg(k) from generate_series(1, 15) k), 'b', (select jsonb_agg(k) from generate_series(1, 15) k)),
    'won', jsonb_build_object('a', '[]'::jsonb, 'b', '[]'::jsonb), 'bids', jsonb_build_object('a', null, 'b', null))
$$;
revoke execute on function public.encheres_init() from public, anon, authenticated;

-- ——— v525 : Les Cryptes entre amis (même moteur que js/core/cryptes.js, sans règle de salle) ——————————————
-- 20 cartes en 10 paires (les 7 factions, trois en double), face cachée : le serveur ne montre à chacun que les cartes
-- retournées, prises ou révélées ; le Regard infernal ne montre la carte qu'à celui qui l'a utilisé.
create or replace function public.cryptes_init(first text) returns jsonb language sql volatile as $$
  with base as (select unnest(array['infernal', 'abyssal', 'celeste', 'sauvage', 'necrotique', 'primordial', 'artificiel']) f),
  extra as (select f from base order by random() limit 3),
  pf as (select f, row_number() over () - 1 k from (select f from base union all select f from extra) z),
  cards as (select jsonb_build_object('k', k, 'f', f, 'gone', null) c from pf, generate_series(1, 2))
  select jsonb_build_object('cards', (select jsonb_agg(c order by random()) from cards), 'open', '[]'::jsonb, 'turn', first, 'first', first,
    'pairs', jsonb_build_object('a', '[]'::jsonb, 'b', '[]'::jsonb), 'bonus', jsonb_build_object('a', 0, 'b', 0), 'grace', jsonb_build_object('a', 0, 'b', 0),
    'block', jsonb_build_object('a', false, 'b', false), 'pending', null, 'lastPair', null, 'n', 0, 'turns', 0, 'log', '[]'::jsonb)
$$;
revoke execute on function public.cryptes_init(text) from public, anon, authenticated;
create or replace function public.cryptes_hidden(st jsonb) returns int[] language sql immutable as $$
  select coalesce(array_agg(o - 1 order by o), '{}') from jsonb_array_elements(st -> 'cards') with ordinality e(c, o)
  where c ->> 'gone' is null and not ((st -> 'open') @> to_jsonb(o - 1))
$$;
create or replace function public.cryptes_apply(st jsonb, who text, mv jsonb)
returns jsonb language plpgsql volatile set search_path = public as $$
declare opp text := case when who = 'a' then 'b' else 'a' end; ev jsonb; n int; i int; x int; y int; cx jsonb; cy jsonb; f text; pick int;
  picks int[]; hid int[]; k jsonb; tmp jsonb; sa int; sb int;
begin
  if (st ->> 'over') is not null then raise exception 'Cette partie est terminée.'; end if;
  if st ->> 'turn' <> who then raise exception 'Ce n’est pas ton tour.'; end if;
  hid := public.cryptes_hidden(st);
  if mv ? 'picks' then
    if jsonb_typeof(st -> 'pending') <> 'object' then raise exception 'Aucun pouvoir en attente.'; end if;
    if jsonb_typeof(mv -> 'picks') <> 'array' then raise exception 'Choisis une carte face cachée.'; end if;
    select array_agg(v::int) into picks from jsonb_array_elements_text(mv -> 'picks') v;
    if coalesce(array_length(picks, 1), 0) <> (st #>> '{pending,pick}')::int or (select count(distinct v) from unnest(picks) v) <> array_length(picks, 1)
      or not (picks <@ hid) then raise exception 'Choisis une carte face cachée.'; end if;
    f := st #>> '{pending,power}';
    ev := jsonb_build_object('who', who, 'kind', 'power', 'power', f, 'i', to_jsonb(picks));
    if f in ('infernal', 'sauvage') then ev := ev || jsonb_build_object('card', (st -> 'cards' -> picks[1]) - 'gone'); end if;
    if f = 'abyssal' then
      tmp := st -> 'cards' -> picks[1];
      st := jsonb_set(st, array['cards', picks[1]::text], st -> 'cards' -> picks[2]);
      st := jsonb_set(st, array['cards', picks[2]::text], tmp);
    end if;
    st := jsonb_set(st, '{pending}', 'null');
  elsif mv ? 'flip' then
    if jsonb_typeof(st -> 'pending') = 'object' then raise exception 'Choisis d’abord la cible du pouvoir.'; end if;
    i := (mv ->> 'flip')::int;
    if i is null or not (i = any(hid)) then raise exception 'Cette carte ne peut pas être retournée.'; end if;
    st := jsonb_set(st, '{open}', (st -> 'open') || to_jsonb(i));
    if jsonb_array_length(st -> 'open') = 1 then
      ev := jsonb_build_object('who', who, 'kind', 'first', 'i', i, 'card', (st -> 'cards' -> i) - 'gone');
    else
      x := (st -> 'open' ->> 0)::int; y := (st -> 'open' ->> 1)::int;
      st := jsonb_set(st, '{open}', '[]');
      cx := st -> 'cards' -> x; cy := st -> 'cards' -> y;
      if (cx ->> 'k') = (cy ->> 'k') then
        st := jsonb_set(st, array['cards', x::text, 'gone'], to_jsonb(who));
        st := jsonb_set(st, array['cards', y::text, 'gone'], to_jsonb(who));
        st := jsonb_set(st, array['pairs', who], (st -> 'pairs' -> who) || (cx -> 'k'));
        st := jsonb_set(st, '{lastPair}', to_jsonb(who));
        f := cx ->> 'f';
        ev := jsonb_build_object('who', who, 'kind', 'match', 'i', jsonb_build_array(x, y), 'f', f, 'k', cx -> 'k', 'card', cx - 'gone', 'power', f);
        if (st -> 'block' ->> who)::boolean then
          st := jsonb_set(st, array['block', who], 'false'); ev := ev || '{"blocked": true}';
        elsif f = 'celeste' then st := jsonb_set(st, array['grace', who], to_jsonb((st -> 'grace' ->> who)::int + 1));
        elsif f = 'primordial' then st := jsonb_set(st, array['bonus', who], to_jsonb((st -> 'bonus' ->> who)::int + 1));
        elsif f = 'artificiel' then st := jsonb_set(st, array['block', opp], 'true');
        elsif f = 'necrotique' then
          if jsonb_array_length(st -> 'pairs' -> opp) > 0 then
            k := st -> 'pairs' -> opp -> -1;
            st := jsonb_set(st, array['pairs', opp], (st -> 'pairs' -> opp) - (-1));
            st := jsonb_set(st, array['pairs', who], (st -> 'pairs' -> who) || k);
            ev := ev || jsonb_build_object('stolen', k);
          else ev := ev || '{"empty": true}'; end if;
        else
          pick := case when f = 'abyssal' then 2 else 1 end;
          if coalesce(array_length(public.cryptes_hidden(st), 1), 0) >= pick then st := jsonb_set(st, '{pending}', jsonb_build_object('power', f, 'pick', pick));
          else ev := ev || '{"empty": true}'; end if;
        end if;
        -- tout est pris : le plus de points gagne ; à égalité, celui qui a pris la dernière paire
        if coalesce(array_length(public.cryptes_hidden(st), 1), 0) = 0 then
          sa := jsonb_array_length(st -> 'pairs' -> 'a') + (st -> 'bonus' ->> 'a')::int;
          sb := jsonb_array_length(st -> 'pairs' -> 'b') + (st -> 'bonus' ->> 'b')::int;
          st := st || jsonb_build_object('over', true, 'winner', case when sa > sb then 'a' when sb > sa then 'b' else st ->> 'lastPair' end, 'final', jsonb_build_object('a', sa, 'b', sb), 'pending', null);
        end if;
      else
        ev := jsonb_build_object('who', who, 'kind', 'miss', 'i', jsonb_build_array(x, y), 'cards', jsonb_build_array(cx - 'gone', cy - 'gone'));
        if (st -> 'grace' ->> who)::int > 0 then
          st := jsonb_set(st, array['grace', who], to_jsonb((st -> 'grace' ->> who)::int - 1)); ev := ev || '{"graced": true}';
        else
          st := st || jsonb_build_object('turn', opp, 'turns', (st ->> 'turns')::int + 1);
        end if;
      end if;
    end if;
  else
    raise exception 'Action inconnue.';
  end if;
  n := coalesce((st ->> 'n')::int, 0) + 1;
  ev := ev || jsonb_build_object('n', n);
  st := st || jsonb_build_object('n', n, 'last', ev);
  st := jsonb_set(st, '{log}', (select coalesce(jsonb_agg(z.x order by z.o), '[]') from (select e.x, e.o from jsonb_array_elements(coalesce(st -> 'log', '[]') || jsonb_build_array(ev)) with ordinality e(x, o) order by e.o desc limit 20) z));
  if (st ->> 'over') is not null then st := st || jsonb_build_object('turn', null); end if;
  return st;
end $$;
revoke execute on function public.cryptes_apply(jsonb, text, jsonb) from public, anon, authenticated;

-- ——— Parties des Enchères et des Cryptes : créer, accepter, jouer ————————————————————————————
create or replace function public.mp_start(p_id uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
declare d public.mp_matches; first text := case when random() < 0.5 then 'a' else 'b' end; st jsonb;
begin
  select * into d from public.mp_matches where id = p_id for update;
  st := case d.game when 'encheres' then public.encheres_init() when 'cryptes' then public.cryptes_init(first) end;
  update public.mp_matches set status = 'playing', turn = st ->> 'turn', deadline = now() + public.mp_delay(d.pace, true), updated_at = now(), state = st where id = p_id;
end $$;
revoke execute on function public.mp_start(uuid) from public, anon, authenticated;

-- Nouvelle partie : au hasard (Enchères) ou défi à un ami (Enchères, Cryptes : entre amis seulement)
create or replace function public.mp_new(p_game text, p_to uuid default null, p_pace text default 'slow')
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); m public.mp_matches; id uuid; n int;
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  if p_game is null or p_game not in ('encheres', 'cryptes') then raise exception 'Jeu inconnu.'; end if;
  if not exists (select 1 from public.profiles where profiles.id = me) then raise exception 'Choisis d’abord ton pseudo (Sanctuaire → Compte).'; end if;
  if p_pace is null or p_pace not in ('fast', 'slow') then raise exception 'Vitesse inconnue.'; end if;
  if p_game = 'cryptes' and p_to is null then raise exception 'Les Cryptes se jouent seulement entre amis.'; end if;
  perform public.mp_expire();
  select count(*) into n from public.mp_matches where me in (a, b) and status in ('waiting', 'playing');
  if n >= 10 then raise exception 'Tu as déjà 10 parties en cours : termine-en une d’abord.'; end if;
  if p_to is null then
    select * into m from public.mp_matches where game = p_game and status = 'waiting' and public and b is null and a <> me and pace = p_pace
      order by created_at limit 1 for update skip locked;
    if found then
      update public.mp_matches set b = me where mp_matches.id = m.id;
      perform public.mp_start(m.id);
      return m.id;
    end if;
    if exists (select 1 from public.mp_matches where game = p_game and status = 'waiting' and public and a = me and pace = p_pace) then
      raise exception 'Tu cherches déjà un adversaire : ta partie commencera dès qu’un joueur arrive.';
    end if;
  else
    if p_to = me then raise exception 'Tu ne peux pas te défier toi-même.'; end if;
    if not public.are_friends(me, p_to) then raise exception 'Ce joueur n’est pas ton ami.'; end if;
  end if;
  insert into public.mp_matches (game, a, b, public, pace, state) values (p_game, me, p_to, p_to is null, p_pace, '{}'::jsonb)
  returning mp_matches.id into id;
  return id;
end $$;

create or replace function public.mp_join(p_id uuid)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); m public.mp_matches;
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  perform public.mp_expire();
  select * into m from public.mp_matches where id = p_id and game in ('encheres', 'cryptes') for update;
  if not found or m.status <> 'waiting' or m.b is distinct from me or m.public then raise exception 'Cette partie n’est plus disponible.'; end if;
  perform public.mp_start(p_id);
  return p_id;
end $$;

-- Jouer : Enchères {"offer": 7} ; Cryptes {"flip": 12} ou {"picks": [3, 8]}
create or replace function public.mp_act(p_id uuid, p_move jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); m public.mp_matches; who text; st jsonb;
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  perform public.mp_expire();
  select * into m from public.mp_matches where id = p_id and game in ('encheres', 'cryptes') and me in (a, b) for update;
  if not found then raise exception 'Partie introuvable.'; end if;
  if m.status <> 'playing' then raise exception 'Cette partie est terminée.'; end if;
  who := case when m.a = me then 'a' else 'b' end;
  if m.turn <> who and m.turn <> 'ab' then raise exception '%', case when m.game = 'encheres' then 'Ton offrande est déjà posée : on attend ton adversaire.' else 'Ce n’est pas ton tour.' end; end if;
  if m.game = 'encheres' then st := public.encheres_apply(m.state, who, (p_move ->> 'offer')::int);
  else st := public.cryptes_apply(m.state, who, p_move); end if;
  if (st ->> 'over')::boolean then
    update public.mp_matches set state = st, status = 'done', winner = st ->> 'winner', reason = 'score', turn = null, deadline = null, updated_at = now() where id = p_id;
  else
    update public.mp_matches set state = st, turn = st ->> 'turn', deadline = now() + public.mp_delay(m.pace), updated_at = now() where id = p_id;
  end if;
  return public.mp_view(p_id);
end $$;

-- Ce que chaque joueur voit de la partie (cartes cachées, offrande adverse secrète, paquet sans son ordre)
create or replace function public.mp_state_for(m public.mp_matches, me text)
returns jsonb language plpgsql stable set search_path = public as $$
declare st jsonb := m.state; foe text := case when me = 'a' then 'b' else 'a' end; i int;
begin
  if m.game = 'sceaux' then return st - 'handA'; end if;
  if m.game = 'pacte' then
    if st ? 'deck' then st := jsonb_set(st, '{deck}', coalesce((select jsonb_agg(x order by x::text) from jsonb_array_elements(st -> 'deck') x), '[]')); end if;
    return st;
  end if;
  if m.game = 'encheres' and st ? 'lots' then
    i := coalesce((st ->> 'i')::int, 0);
    return (st - 'lots' - 'bids') || jsonb_build_object('total', jsonb_array_length(st -> 'lots'), 'lot', st -> 'lots' -> i,
      'rest', coalesce((select jsonb_agg(x order by (x ->> 'v')::int desc) from jsonb_array_elements(st -> 'lots') with ordinality e(x, o) where o - 1 > i), '[]'),
      'bids', jsonb_build_object(me, st -> 'bids' -> me, foe, (st -> 'bids' ->> foe) is not null));
  end if;
  if m.game = 'cryptes' and st ? 'cards' then
    return st || jsonb_build_object(
      'cards', (select jsonb_agg(case when c ->> 'gone' is not null or (st -> 'open') @> to_jsonb(o - 1) then c else jsonb_build_object('gone', null) end order by o) from jsonb_array_elements(st -> 'cards') with ordinality e(c, o)),
      'log', coalesce((select jsonb_agg(case when x ->> 'power' = 'infernal' and x ->> 'kind' = 'power' and x ->> 'who' <> me then x - 'card' else x end order by o) from jsonb_array_elements(st -> 'log') with ordinality e(x, o)), '[]'),
      'last', case when st #>> '{last,power}' = 'infernal' and st #>> '{last,kind}' = 'power' and st #>> '{last,who}' <> me then (st -> 'last') - 'card' else st -> 'last' end);
  end if;
  return st;
end $$;
revoke execute on function public.mp_state_for(public.mp_matches, text) from public, anon, authenticated;

-- Victoires et défaites contre chaque ami (Cryptes : pas de récompense, seulement ce compte)
create or replace function public.mp_friend_record(p_game text)
returns table (foe uuid, pseudo text, avatar text, wins int, losses int, draws int)
language sql stable security definer set search_path = public as $$
  with r as (
    select case when a = auth.uid() then b else a end as foe,
      case when winner = 'draw' then 'd' when (winner = 'a') = (a = auth.uid()) then 'w' else 'l' end as res
    from public.mp_matches where game = p_game and status = 'done' and auth.uid() in (a, b) and b is not null
  )
  select r.foe, p.pseudo, p.avatar, count(*) filter (where res = 'w')::int, count(*) filter (where res = 'l')::int, count(*) filter (where res = 'd')::int
  from r join public.profiles p on p.id = r.foe group by r.foe, p.pseudo, p.avatar order by count(*) desc limit 50
$$;

-- Abandonner (partie en cours), annuler (en attente) ou refuser un défi d'ami
create or replace function public.mp_leave(p_id uuid)
returns text language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); m public.mp_matches;
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  perform public.mp_expire(); -- v527 : un adversaire déjà hors délai a perdu avant ton abandon
  select * into m from public.mp_matches where id = p_id and me in (a, b) for update;
  if not found then raise exception 'Partie introuvable.'; end if;
  if m.status = 'waiting' then update public.mp_matches set status = 'cancelled', updated_at = now() where id = p_id; return 'cancelled'; end if;
  if m.status = 'playing' then
    update public.mp_matches set status = 'done', winner = case when m.a = me then 'b' else 'a' end, reason = 'resign', turn = null, deadline = null, updated_at = now() where id = p_id;
    return 'resigned';
  end if;
  return 'over';
end $$;

-- v527 : annuler une recherche ou un défi encore en attente (jamais un abandon : sans effet si la partie a commencé)
create or replace function public.mp_cancel(p_id uuid)
returns text language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  update public.mp_matches set status = 'cancelled', updated_at = now() where id = p_id and a = me and status = 'waiting';
  return case when found then 'cancelled' else 'none' end;
end $$;

-- Vue d'une partie pour un de ses joueurs (me = 'a' ou 'b')
create or replace function public.mp_view(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', m.id, 'game', m.game, 'status', m.status, 'public', m.public, 'turn', m.turn, 'deadline', m.deadline,
    'me', case when m.a = auth.uid() then 'a' else 'b' end, 'state', public.mp_state_for(m, case when m.a = auth.uid() then 'a' else 'b' end), 'winner', m.winner, 'reason', m.reason,
    'claimed', case when m.a = auth.uid() then m.a_claimed else m.b_claimed end, 'created_at', m.created_at, 'updated_at', m.updated_at,
    'now', now(), 'hours', public.mp_hours(), 'pace', m.pace,
    'foe', (select jsonb_build_object('id', p.id, 'pseudo', p.pseudo, 'avatar', p.avatar, 'badge', p.badge) from public.profiles p where p.id = case when m.a = auth.uid() then m.b else m.a end))
  from public.mp_matches m where m.id = p_id and auth.uid() in (m.a, m.b)
$$;

create or replace function public.mp_get(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Connecte-toi d’abord.'; end if;
  perform public.mp_expire();
  return public.mp_view(p_id);
end $$;

-- Mes parties (en attente, en cours, et les 15 dernières terminées)
create or replace function public.mp_list(p_game text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  perform public.mp_expire();
  return coalesce((select jsonb_agg(public.mp_view(x.id) order by x.updated_at desc) from (
    (select id, updated_at from public.mp_matches where game = p_game and me in (a, b) and status in ('waiting', 'playing'))
    union all
    (select id, updated_at from public.mp_matches where game = p_game and me in (a, b) and status = 'done' order by updated_at desc limit 15)
  ) x), '[]'::jsonb);
end $$;

-- Encaisser le résultat d'une partie terminée (une seule fois par joueur) : 'win' | 'lose' | 'draw' | 'already'
create or replace function public.mp_claim(p_id uuid)
returns text language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); m public.mp_matches; who text;
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  perform public.mp_expire();
  select * into m from public.mp_matches where id = p_id and me in (a, b) for update;
  if not found or m.status <> 'done' then raise exception 'Cette partie n’est pas terminée.'; end if;
  who := case when m.a = me then 'a' else 'b' end;
  if (who = 'a' and m.a_claimed) or (who = 'b' and m.b_claimed) then return 'already'; end if;
  if who = 'a' then update public.mp_matches set a_claimed = true where id = p_id; else update public.mp_matches set b_claimed = true where id = p_id; end if;
  return case when m.winner = who then 'win' when m.winner = 'draw' then 'draw' else 'lose' end;
end $$;

-- Classement du mois : victoires contre d'autres joueurs
create or replace function public.mp_ranking(p_game text, p_limit int default 30)
returns table (user_id uuid, wins int, games int, pseudo text, avatar text, badge text)
language sql stable security definer set search_path = public as $$
  with r0 as (
    select case when winner = 'a' then a else b end as w, case when winner = 'a' then b else a end as l, a, b,
      row_number() over (partition by case when winner = 'a' then a else b end, case when winner = 'a' then b else a end order by updated_at) as k
    from public.mp_matches
    where game = p_game and status = 'done' and winner in ('a', 'b') and updated_at >= date_trunc('month', now())
  ), r as (
    -- v527 : 3 victoires au plus contre un même adversaire dans le mois (contre les comptes de complaisance)
    select w, a, b from r0 where k <= 3
  ), s as (
    select u as user_id, count(*) filter (where u = w)::int as wins, count(*)::int as games
    from r, lateral (values (r.a), (r.b)) v(u) group by u
  )
  select s.user_id, s.wins, s.games, p.pseudo, p.avatar, p.badge from s join public.profiles p on p.id = s.user_id
  where s.wins > 0 order by s.wins desc, s.games asc limit greatest(1, least(p_limit, 100))
$$;

revoke execute on function public.sceaux_mp_new(text[], uuid, text) from public, anon;
revoke execute on function public.sceaux_mp_join(uuid, text[]) from public, anon;
revoke execute on function public.sceaux_mp_play(uuid, int, int) from public, anon;
revoke execute on function public.mp_leave(uuid) from public, anon;
revoke execute on function public.mp_cancel(uuid) from public, anon;
revoke execute on function public.mp_view(uuid) from public, anon, authenticated;
revoke execute on function public.mp_get(uuid) from public, anon;
revoke execute on function public.mp_list(text) from public, anon;
revoke execute on function public.mp_claim(uuid) from public, anon;
revoke execute on function public.mp_ranking(text, int) from public, anon;
grant execute on function public.sceaux_mp_new(text[], uuid, text) to authenticated;
grant execute on function public.sceaux_mp_join(uuid, text[]) to authenticated;
grant execute on function public.sceaux_mp_play(uuid, int, int) to authenticated;
grant execute on function public.mp_leave(uuid) to authenticated;
grant execute on function public.mp_cancel(uuid) to authenticated;
revoke execute on function public.pacte_mp_new(uuid, text) from public, anon;
revoke execute on function public.pacte_mp_join(uuid) from public, anon;
revoke execute on function public.pacte_mp_act(uuid, text) from public, anon;
grant execute on function public.pacte_mp_new(uuid, text) to authenticated;
grant execute on function public.pacte_mp_join(uuid) to authenticated;
grant execute on function public.pacte_mp_act(uuid, text) to authenticated;
revoke execute on function public.mp_new(text, uuid, text) from public, anon;
revoke execute on function public.mp_join(uuid) from public, anon;
revoke execute on function public.mp_act(uuid, jsonb) from public, anon;
revoke execute on function public.mp_friend_record(text) from public, anon;
grant execute on function public.mp_new(text, uuid, text) to authenticated;
grant execute on function public.mp_join(uuid) to authenticated;
grant execute on function public.mp_act(uuid, jsonb) to authenticated;
grant execute on function public.mp_friend_record(text) to authenticated;
grant execute on function public.mp_get(uuid) to authenticated;
grant execute on function public.mp_list(text) to authenticated;
grant execute on function public.mp_claim(uuid) to authenticated;
grant execute on function public.mp_ranking(text, int) to authenticated;

-- Vérification : nombre de cartes et de parties
select (select count(*) from public.sceaux_cards) as cartes, (select count(*) from public.mp_matches) as parties;
