-- ABYSSAL · badges attribués par le serveur (ex. « Créateur »), impossibles à modifier par les joueurs.
alter table public.profiles add column if not exists badge text;
-- Les joueurs ne peuvent écrire que ces colonnes-là (jamais le badge).
revoke insert, update on public.profiles from authenticated;
grant insert (id, pseudo, avatar, title, level, owned, updated_at) on public.profiles to authenticated;
grant update (pseudo, avatar, title, level, owned, updated_at) on public.profiles to authenticated;
-- Badge du créateur
update public.profiles set badge = 'createur' where lower(pseudo) = lower('Gardien du Sceau');
select pseudo, badge from public.profiles where badge is not null;
