-- ABYSSAL · 18 : suppression de tous les comptes sauf ceux du propriétaire (26 octobre 2026).
-- IRRÉVERSIBLE. À coller une seule fois dans Supabase → SQL Editor → New query → Run.
-- Comptes gardés : contact@abyssal-game.fr et abyssal.gamecards@gmail.com.
-- Tout le reste part avec chaque compte supprimé (effacement en cascade, comme « Supprimer mon compte ») :
-- profil, sauvegarde, partie du serveur, fiche d'ami, amitiés, scores, Épreuves, Tirage, Choc,
-- parties en ligne, signalements, notifications, présence.
-- Sécurité : si aucun des deux comptes à garder n'est trouvé, rien n'est effacé.
do $$
declare
  keep text[] := array['contact@abyssal-game.fr', 'abyssal.gamecards@gmail.com'];
  kept int;
  gone int;
begin
  select count(*) into kept from auth.users where lower(trim(email)) = any (keep);
  if kept = 0 then
    raise exception 'Aucun des deux comptes à garder n''a été trouvé : rien n''a été effacé.';
  end if;
  delete from auth.users where email is null or lower(trim(email)) <> all (keep);
  get diagnostics gone = row_count;
  raise notice 'Comptes gardés : %, comptes supprimés : %', kept, gone;
end $$;

-- Vérification : ne doit plus lister que les comptes gardés.
select email, created_at from auth.users order by created_at;
