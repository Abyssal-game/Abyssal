-- Correctif : l'enregistrement du profil a aussi besoin du droit sur la colonne id (même valeur),
-- puis attribution du badge à partir de l'e-mail du compte (crée le profil s'il n'existe pas).
grant update (id, pseudo, avatar, title, level, owned, updated_at) on public.profiles to authenticated;
insert into public.profiles (id, pseudo, badge)
select id, 'Gardien du Sceau', 'createur' from auth.users where email = 'TON-EMAIL'
on conflict (id) do update set badge = 'createur';
select p.pseudo, p.badge, u.email from public.profiles p join auth.users u on u.id = p.id;
