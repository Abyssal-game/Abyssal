-- Tirage des Ombres (à exécuter une fois dans Supabase : SQL Editor > New query > coller > Run).
-- Un booster gratuit par jour, tiré par le serveur (impossible à truquer depuis le téléphone).
-- Classement de la semaine (lundi → dimanche, heure de Paris) : somme des tirages du joueur.
-- Les 3 premiers gagnent un coffre (abyssal, or, fer) s'il y a au moins 5 participants.
-- Fichier généré par tools/tirage-sql.py (liste des cartes à jour).

create table if not exists public.shadow_cards (
  id text primary key,
  rarity text not null,
  faction text not null,
  variants text[] not null default '{}'
);
alter table public.shadow_cards enable row level security;
revoke all on public.shadow_cards from anon, authenticated;
truncate public.shadow_cards;
insert into public.shadow_cards (id, rarity, faction, variants) values
--CARTES--;

create table if not exists public.shadow_draws (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  week date not null,
  faction text not null,
  cards jsonb not null,
  score int not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);
create index if not exists shadow_draws_day on public.shadow_draws (day, score desc);
create index if not exists shadow_draws_week on public.shadow_draws (week);
alter table public.shadow_draws enable row level security;
drop policy if exists "tirages lisibles" on public.shadow_draws;
create policy "tirages lisibles" on public.shadow_draws for select to authenticated using (true);
revoke all on public.shadow_draws from anon;
grant select on public.shadow_draws to authenticated;

create table if not exists public.shadow_claims (
  user_id uuid not null references public.profiles(id) on delete cascade,
  week date not null,
  rank int not null,
  created_at timestamptz not null default now(),
  primary key (user_id, week)
);
alter table public.shadow_claims enable row level security;
revoke all on public.shadow_claims from anon, authenticated;

create or replace function public.shadow_today() returns date language sql stable as $$
  select (now() at time zone 'Europe/Paris')::date
$$;

-- Le tirage du jour : 4 emplacements normaux + 1 Peu commune ou mieux, finitions rares,
-- points = valeur de la rareté + 8 par finition, doublés pour la faction choisie.
create or replace function public.shadow_draw(p_faction text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  d date := public.shadow_today();
  slot int; x float8; r text; c record; v text; pts int; total int := 0; out jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  if p_faction not in ('infernal','abyssal','celeste','sauvage','necrotique','primordial','artificiel') then raise exception 'Faction inconnue'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid()) then raise exception 'Choisis d’abord un pseudo (Sanctuaire > Compte en ligne).'; end if;
  if exists (select 1 from public.shadow_draws where user_id = auth.uid() and day = d) then raise exception 'Tu as déjà fait ton tirage aujourd’hui.'; end if;
  for slot in 1..5 loop
    x := random() * 100;
    if slot < 5 then
      r := case when x < 74 then 'C' when x < 94 then 'PC' when x < 98.8 then 'R' when x < 99.8 then 'HR' when x < 99.97 then 'M' else 'S' end;
    else
      r := case when x < 82 then 'PC' when x < 96 then 'R' when x < 99.3 then 'HR' when x < 99.9 then 'M' else 'S' end;
    end if;
    select * into c from public.shadow_cards where rarity = r order by random() limit 1;
    x := random() * 100; v := 'normal';
    if 'holo' = any(c.variants) then if x < 2.5 then v := 'holo'; end if; x := x - 2.5; end if;
    if v = 'normal' and 'gold' = any(c.variants) then if x >= 0 and x < 0.5 then v := 'gold'; end if; x := x - 0.5; end if;
    if v = 'normal' and 'galaxy' = any(c.variants) then if x >= 0 and x < 0.1 then v := 'galaxy'; end if; end if;
    pts := case r when 'C' then 1 when 'PC' then 2 when 'R' then 6 when 'HR' then 20 when 'M' then 80 else 200 end + case when v = 'normal' then 0 else 8 end;
    if c.faction = p_faction then pts := pts * 2; end if;
    total := total + pts;
    out := out || jsonb_build_object('id', c.id, 'rarity', r, 'variant', v, 'pts', pts, 'double', c.faction = p_faction);
  end loop;
  insert into public.shadow_draws (user_id, day, week, faction, cards, score)
  values (auth.uid(), d, date_trunc('week', d)::date, p_faction, out, total);
  return jsonb_build_object('day', d, 'cards', out, 'score', total);
end $$;
revoke execute on function public.shadow_draw(text) from public, anon;
grant execute on function public.shadow_draw(text) to authenticated;

-- Classement d'une semaine : total, nombre de jours, égalité départagée par le premier arrivé à ce total
create or replace function public.shadow_week(p_week date, p_limit int default 30)
returns table (user_id uuid, total int, days int, pseudo text, avatar text, badge text, participants int)
language sql stable security definer set search_path = public as $$
  with t as (
    select s.user_id, sum(s.score)::int as total, count(*)::int as days, max(s.created_at) as last_at
    from public.shadow_draws s where s.week = p_week group by s.user_id
  )
  select t.user_id, t.total, t.days, p.pseudo, p.avatar, p.badge, (select count(*)::int from t)
  from t join public.profiles p on p.id = t.user_id
  order by t.total desc, t.last_at asc
  limit greatest(1, least(p_limit, 100))
$$;
revoke execute on function public.shadow_week(date, int) from public, anon;
grant execute on function public.shadow_week(date, int) to authenticated;

-- Prix d'une semaine terminée : renvoie le rang (1 à 3) une seule fois, sinon 0
create or replace function public.shadow_claim(p_week date)
returns int language plpgsql security definer set search_path = public as $$
declare rk int; n int;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  if p_week + 7 > public.shadow_today() then return 0; end if;
  if exists (select 1 from public.shadow_claims where user_id = auth.uid() and week = p_week) then return 0; end if;
  select count(distinct user_id) into n from public.shadow_draws where week = p_week;
  if n < 5 then return 0; end if;
  select x.rk into rk from (
    select s.user_id, row_number() over (order by sum(s.score) desc, max(s.created_at) asc) as rk
    from public.shadow_draws s where s.week = p_week group by s.user_id
  ) x where x.user_id = auth.uid();
  if rk is null or rk > 3 then return 0; end if;
  insert into public.shadow_claims (user_id, week, rank) values (auth.uid(), p_week, rk);
  return rk;
end $$;
revoke execute on function public.shadow_claim(date) from public, anon;
grant execute on function public.shadow_claim(date) to authenticated;
