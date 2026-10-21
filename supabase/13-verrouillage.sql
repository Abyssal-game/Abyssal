-- ABYSSAL v539 : verrouillage (anti-triche, étape 1, second fichier).
-- ⚠ À coller SEULEMENT quand le jeu affiche, dans Réglages → À propos : « Progression gardée par le serveur ».
-- Avant, il empêcherait l'ancien système de sauvegarder.
-- Supabase → SQL Editor → New query → Run. Se recolle sans danger.
--
-- Après ce fichier, un joueur ne peut plus rien écrire lui-même de sa progression : ni sa sauvegarde, ni sa fiche d'ami,
-- ni son portrait, son titre, son niveau ou son nombre de créatures, ni ses Épreuves gagnées. Tout passe par le serveur
-- de partie (fonction « partie »), qui rejoue ses actions. Il garde seulement le choix de son pseudo.

-- ancienne sauvegarde : lecture seule (le serveur de partie la reprend une fois à la première connexion)
revoke insert, update, delete on public.saves from authenticated;

-- fiche d'ami : écrite par le serveur
do $$ begin
  if to_regclass('public.player_cards') is not null then
    execute 'revoke insert, update, delete on public.player_cards from authenticated';
  end if;
end $$;

-- profil : le joueur choisit seulement son pseudo
revoke insert, update on public.profiles from authenticated;
grant insert (id, pseudo, updated_at) on public.profiles to authenticated;
grant update (id, pseudo, updated_at) on public.profiles to authenticated;

-- Épreuves : comptées par le serveur
do $$ begin
  if to_regprocedure('public.trial_win(date, integer, integer)') is not null then
    execute 'revoke execute on function public.trial_win(date, integer, integer) from authenticated';
  end if;
  if to_regprocedure('public.submit_score(date, integer, boolean)') is not null then
    execute 'revoke execute on function public.submit_score(date, integer, boolean) from authenticated';
  end if;
end $$;

-- Vérification
select (select count(*) from public.parties where data is not null) as parties_sur_le_serveur, 'verrouillage fait' as etat;
