# Vérifier les achats avant d'envoyer la version 1.2 à Apple (v904)

Pourquoi : si un achat échoue pendant l'examen, Apple refuse la version. Tout se vérifie sur l'iPhone, dans l'app TestFlight :
les achats y passent par le « bac à sable » d'Apple, **ils ne coûtent rien** (aucun euro débité).

## A. Avant de commencer (une seule fois)
1. App Store Connect → ABYSSAL → Achats intégrés : les 6 articles doivent être au statut **« Prêt à soumettre »** (pas « Métadonnées manquantes »).
2. RevenueCat (app.revenuecat.com) → projet ABYSSAL :
   - Products : les 6 identifiants d'App Store Connect sont importés ;
   - l'app iOS a sa **clé « App Store Connect API »** (ou le « shared secret ») renseignée : sans elle, RevenueCat ne peut pas vérifier les achats.
3. Supabase → Edge Functions → Secrets : `REVENUECAT_SECRET` existe (déjà posé).
4. Construire une nouvelle version TestFlight depuis le Mac (routine habituelle) et l'installer.

## B. Les essais dans l'app TestFlight (avec l'aperçu de l'Échoppe du Mode Créateur)
| # | Geste | Ce qui doit se passer |
|---|---|---|
| 1 | Butin → Codex → L'Échoppe → Obtenir | Les 4 paquets d'obsidiennes s'affichent **avec un prix en euros** (pas « Les achats ouvrent bientôt ») |
| 2 | Acheter le plus petit paquet | La fenêtre d'Apple s'ouvre avec la mention **[Environment: Sandbox]** ; après validation, les obsidiennes arrivent en quelques secondes |
| 3 | Fermer et rouvrir l'app | Les obsidiennes sont toujours là (le serveur les a bien données) |
| 4 | Acheter le Pack du Fondateur | Titre, cadre, dos, sachet, plaque, fond et 600 obsidiennes reçus ; le bouton affiche ensuite « Possédé » |
| 5 | Racheter le Pack du Fondateur | Impossible (déjà possédé) |
| 6 | Codex enluminé (si la saison est ouverte en aperçu) | La voie enluminée se débloque |
| 7 | Échoppe → Obtenir → « Restaurer mes achats » (en bas) | Message de réussite, **rien n'est donné deux fois** |
| 8 | Lancer un achat puis annuler dans la fenêtre d'Apple | Rien ne se passe, aucun message d'erreur inquiétant |
| 9 | Mode avion, puis acheter | Message clair (pas de plantage) ; au retour du réseau, rien de perdu |
| 10 | Dépenser des obsidiennes à l'Échoppe (un dos, un plateau) | L'objet est reçu et se porte dans Personnaliser |

Si un essai échoue : faire une capture et me l'envoyer, avec le numéro de l'essai.

## C. Le jour de l'envoi de la 1.2
1. Me demander d'ouvrir l'Échoppe (`CODEX.shopFrom`) : je fais la livraison.
2. Construire la version sur le Mac, l'envoyer, puis dans App Store Connect → version 1.2 → section « Achats intégrés » : **cocher les 6 articles** pour les joindre à la version.
3. Notes pour l'examinateur : indiquer le compte de démonstration et « L'Échoppe se trouve dans Butin → Codex → L'Échoppe ».

## D. Côté Google (Android)
Tout le pas à pas est dans `docs/android-achats.md` (profil de paiement, les 6 articles, RevenueCat, clé `goog_`, essai).
