-- ABYSSAL v528 : profil d'un joueur visible par tous les joueurs connectés (demande du propriétaire du 20 octobre 2026 :
-- « quand on voit le pseudo de quelqu'un, même s'il n'est pas notre ami, on peut regarder son profil »).
-- À coller dans Supabase → SQL Editor → New query → Run (après 07-amis.sql). Se recolle sans danger.
-- Un joueur qui n'est pas ton ami voit : pseudo, portrait, cadre, titre, niveau, vitrine, statistiques, exploits, succès.
-- Sa collection complète reste réservée à ses amis (comme avant).

create or replace function public.public_profile(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'pseudo', p.pseudo, 'avatar', p.avatar, 'title', p.title, 'level', p.level, 'owned', p.owned, 'badge', p.badge,
    'me', p.id = auth.uid(),
    'friend', (select case when f.status = 'accepted' then 'accepted' when f.a = auth.uid() then 'sent' else 'received' end
               from public.friendships f where (f.a = auth.uid() and f.b = p.id) or (f.b = auth.uid() and f.a = p.id) limit 1),
    'data', case
      when c.data is null then null
      when p.id = auth.uid() or public.are_friends(auth.uid(), p.id) then c.data
      -- pas ami : la collection est retirée, sauf les cartes de la vitrine ; n = nombre de créatures
      else (c.data - 'col') || jsonb_build_object(
        'col', coalesce((select jsonb_object_agg(k, c.data -> 'col' -> k) from jsonb_array_elements_text(coalesce(c.data -> 'show', '[]'::jsonb)) k where c.data -> 'col' ? k), '{}'::jsonb),
        'n', (select count(*) from jsonb_object_keys(coalesce(c.data -> 'col', '{}'::jsonb))),
        'partial', true)
    end)
  from public.profiles p left join public.player_cards c on c.id = p.id
  where p.id = p_id and auth.uid() is not null
$$;
revoke execute on function public.public_profile(uuid) from public, anon;
grant execute on function public.public_profile(uuid) to authenticated;


-- ABYSSAL:empreinte (écrite par tools/sql-stamp.mjs, ne pas modifier)
create table if not exists public.sql_stamps (file text primary key, stamp text not null, at timestamptz not null default now());
alter table public.sql_stamps enable row level security;
revoke all on public.sql_stamps from public, anon, authenticated;
insert into public.sql_stamps (file, stamp) values ('10', '90244035bbf1') on conflict (file) do update set stamp = excluded.stamp, at = now();
create or replace function public.sql_stamps() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(file, stamp), '{}'::jsonb) from public.sql_stamps;
$$;
revoke execute on function public.sql_stamps() from public, anon;
grant execute on function public.sql_stamps() to authenticated;
-- ABYSSAL:fin

-- Vérification
select 'profils publics prêts' as etat;
