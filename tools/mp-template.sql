-- ABYSSAL · étape 9 : mini-jeux contre d'autres joueurs (Duels des Sceaux en ligne).
-- À coller dans Supabase : SQL Editor → New query → Run. Peut être relancé sans risque.
-- Fichier généré par `node tools/mp-sql.mjs` (valeurs des cartes lues dans le jeu) : à relancer quand des cartes
-- sont ajoutées, puis recoller le fichier dans Supabase.
--
-- Parties à son rythme : chacun joue son coup quand il veut, mais dans un délai (--HEURES-- h par coup).
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

create or replace function public.mp_hours() returns int language sql immutable as $$ select --HEURES-- $$;

-- Parties en attente depuis plus de 24 h : annulées ; coup pas joué dans le délai : perdue pour celui qui devait jouer
create or replace function public.mp_expire()
returns void language sql volatile security definer set search_path = public as $$
  update public.mp_matches set status = 'cancelled', updated_at = now() where status = 'waiting' and created_at < now() - interval '24 hours';
  update public.mp_matches set status = 'done', winner = case when turn = 'a' then 'b' else 'a' end, reason = 'timeout', updated_at = now()
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
  update public.mp_matches set status = 'playing', turn = first, deadline = now() + make_interval(hours => public.mp_hours()), updated_at = now(),
    state = jsonb_build_object('rule', rule, 'board', jsonb_build_array(null, null, null, null, null, null, null, null, null),
      'hands', jsonb_build_object('a', d.state -> 'handA', 'b', to_jsonb(hb)), 'cells', jsonb_build_object('blessed', c1, 'cursed', c2),
      'placed', 0, 'turn', first, 'first', first, 'log', '[]'::jsonb)
  where id = p_id;
end $$;
revoke execute on function public.sceaux_start(uuid, text[]) from public, anon, authenticated;

-- ——— Partie rapide (contre un joueur au hasard) ou défi à un ami ————————————————————————
create or replace function public.sceaux_mp_new(p_hand text[], p_to uuid default null)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); m public.mp_matches; id uuid; n int;
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  if not exists (select 1 from public.profiles where profiles.id = me) then raise exception 'Choisis d’abord ton pseudo (Sanctuaire → Compte).'; end if;
  if not public.sceaux_hand_ok(p_hand) then raise exception 'Ta main doit compter 5 cartes différentes.'; end if;
  perform public.mp_expire();
  select count(*) into n from public.mp_matches where me in (a, b) and status in ('waiting', 'playing');
  if n >= 10 then raise exception 'Tu as déjà 10 parties en cours : termine-en une d’abord.'; end if;
  if p_to is null then
    -- un joueur attend déjà ? on le rejoint
    select * into m from public.mp_matches where game = 'sceaux' and status = 'waiting' and public and b is null and a <> me
      order by created_at limit 1 for update skip locked;
    if found then
      update public.mp_matches set b = me where mp_matches.id = m.id;
      perform public.sceaux_start(m.id, p_hand);
      return m.id;
    end if;
    if exists (select 1 from public.mp_matches where game = 'sceaux' and status = 'waiting' and public and a = me) then
      raise exception 'Tu cherches déjà un adversaire : ta partie commencera dès qu’un joueur arrive.';
    end if;
  else
    if p_to = me then raise exception 'Tu ne peux pas te défier toi-même.'; end if;
    if not public.are_friends(me, p_to) then raise exception 'Ce joueur n’est pas ton ami.'; end if;
  end if;
  insert into public.mp_matches (game, a, b, public, state) values ('sceaux', me, p_to, p_to is null, jsonb_build_object('handA', to_jsonb(p_hand)))
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
  select * into m from public.mp_matches where id = p_id for update;
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
  select * into m from public.mp_matches where id = p_id and me in (a, b) for update;
  if not found then raise exception 'Partie introuvable.'; end if;
  if m.status <> 'playing' then raise exception 'Cette partie est terminée.'; end if;
  who := case when m.a = me then 'a' else 'b' end;
  if m.turn <> who then raise exception 'Ce n’est pas ton tour.'; end if;
  st := public.sceaux_apply(m.state, who, p_idx, p_cell);
  if (st ->> 'over')::boolean then
    update public.mp_matches set state = st, status = 'done', winner = st ->> 'winner', reason = 'score', turn = null, deadline = null, updated_at = now() where id = p_id;
  else
    update public.mp_matches set state = st, turn = st ->> 'turn', deadline = now() + make_interval(hours => public.mp_hours()), updated_at = now() where id = p_id;
  end if;
  return public.mp_view(p_id);
end $$;

-- Abandonner (partie en cours), annuler (en attente) ou refuser un défi d'ami
create or replace function public.mp_leave(p_id uuid)
returns text language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); m public.mp_matches;
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  select * into m from public.mp_matches where id = p_id and me in (a, b) for update;
  if not found then raise exception 'Partie introuvable.'; end if;
  if m.status = 'waiting' then update public.mp_matches set status = 'cancelled', updated_at = now() where id = p_id; return 'cancelled'; end if;
  if m.status = 'playing' then
    update public.mp_matches set status = 'done', winner = case when m.a = me then 'b' else 'a' end, reason = 'resign', turn = null, deadline = null, updated_at = now() where id = p_id;
    return 'resigned';
  end if;
  return 'over';
end $$;

-- Vue d'une partie pour un de ses joueurs (me = 'a' ou 'b')
create or replace function public.mp_view(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', m.id, 'game', m.game, 'status', m.status, 'public', m.public, 'turn', m.turn, 'deadline', m.deadline,
    'me', case when m.a = auth.uid() then 'a' else 'b' end, 'state', m.state - 'handA', 'winner', m.winner, 'reason', m.reason,
    'claimed', case when m.a = auth.uid() then m.a_claimed else m.b_claimed end, 'created_at', m.created_at, 'updated_at', m.updated_at,
    'now', now(), 'hours', public.mp_hours(),
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
  with r as (
    select case when winner = 'a' then a else b end as w, a, b from public.mp_matches
    where game = p_game and status = 'done' and winner in ('a', 'b') and updated_at >= date_trunc('month', now())
  ), s as (
    select u as user_id, count(*) filter (where u = w)::int as wins, count(*)::int as games
    from r, lateral (values (r.a), (r.b)) v(u) group by u
  )
  select s.user_id, s.wins, s.games, p.pseudo, p.avatar, p.badge from s join public.profiles p on p.id = s.user_id
  where s.wins > 0 order by s.wins desc, s.games asc limit greatest(1, least(p_limit, 100))
$$;

revoke execute on function public.sceaux_mp_new(text[], uuid) from public, anon;
revoke execute on function public.sceaux_mp_join(uuid, text[]) from public, anon;
revoke execute on function public.sceaux_mp_play(uuid, int, int) from public, anon;
revoke execute on function public.mp_leave(uuid) from public, anon;
revoke execute on function public.mp_view(uuid) from public, anon, authenticated;
revoke execute on function public.mp_get(uuid) from public, anon;
revoke execute on function public.mp_list(text) from public, anon;
revoke execute on function public.mp_claim(uuid) from public, anon;
revoke execute on function public.mp_ranking(text, int) from public, anon;
grant execute on function public.sceaux_mp_new(text[], uuid) to authenticated;
grant execute on function public.sceaux_mp_join(uuid, text[]) to authenticated;
grant execute on function public.sceaux_mp_play(uuid, int, int) to authenticated;
grant execute on function public.mp_leave(uuid) to authenticated;
grant execute on function public.mp_get(uuid) to authenticated;
grant execute on function public.mp_list(text) to authenticated;
grant execute on function public.mp_claim(uuid) to authenticated;
grant execute on function public.mp_ranking(text, int) to authenticated;

-- Vérification : nombre de cartes et de parties
select (select count(*) from public.sceaux_cards) as cartes, (select count(*) from public.mp_matches) as parties;
