-- ABYSSAL v608 : joueurs en ligne, avec leurs pseudos, visibles par le seul compte « Le Gardien » (demande du propriétaire
-- du 22 octobre 2026). À coller dans Supabase → SQL Editor → New query → Run. Se recolle sans danger.
-- Chaque joueur connecté signale « je suis là » toutes les minutes (online_ping) ; la liste des comptes vus depuis moins
-- de 2 min 30 n'est lisible que par le compte dont le pseudo est « Le Gardien » (nom réservé : personne d'autre ne peut le prendre).

create table if not exists public.online_seen (
  user_id uuid primary key references auth.users(id) on delete cascade,
  seen_at timestamptz not null default now()
);
alter table public.online_seen enable row level security;
-- aucune règle d'accès : la table ne se lit et ne s'écrit que par les fonctions ci-dessous
revoke all on public.online_seen from public, anon, authenticated;

create or replace function public.online_ping()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.online_seen (user_id, seen_at) values (auth.uid(), now())
    on conflict (user_id) do update set seen_at = now();
  delete from public.online_seen where seen_at < now() - interval '1 day';
end $$;

create or replace function public.online_leave()
returns void language sql security definer set search_path = public as $$
  delete from public.online_seen where user_id = auth.uid();
$$;

create or replace function public.online_list()
returns table (id uuid, pseudo text, avatar text, title text, level int, seen_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.pseudo) = 'le gardien') then
    raise exception 'Réservé au compte du créateur';
  end if;
  return query
    select p.id, p.pseudo, p.avatar, p.title, p.level, o.seen_at
    from public.online_seen o join public.profiles p on p.id = o.user_id
    where o.seen_at > now() - interval '150 seconds'
    order by o.seen_at desc limit 300;
end $$;

revoke execute on function public.online_ping() from public, anon;
revoke execute on function public.online_leave() from public, anon;
revoke execute on function public.online_list() from public, anon;
grant execute on function public.online_ping() to authenticated;
grant execute on function public.online_leave() to authenticated;
grant execute on function public.online_list() to authenticated;

-- Vérification
select 'joueurs en ligne prêts' as etat;
