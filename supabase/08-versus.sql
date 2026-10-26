-- ABYSSAL · étape 8 : Versus Booster (défis de boosters entre joueurs). v516 : composition libre des boosters.
-- À coller dans Supabase : SQL Editor → New query → Run. Peut être relancé sans risque.
-- Fichier généré par `node tools/versus-sql.mjs` (cartes et probabilités lues dans le jeu) : à relancer
-- quand des cartes sont ajoutées, puis recoller le fichier dans Supabase.
--
-- Un joueur lance un défi : type de booster (standard, faction, alliances, premium) et nombre (1 à 3).
-- Défi ouvert à tous, ou envoyé à un ami. Celui qui le relève paie la même mise : le serveur ouvre alors
-- les boosters des deux joueurs (impossible à truquer depuis le téléphone) et compte les points
-- (Commune 1, Peu commune 2, Rare 6, Hyper rare 20, Mythique 80, Secrète 200, +8 par finition).
-- Le meilleur total remporte toutes les cartes ; égalité : chacun garde les cartes de ses boosters.
-- Un défi non relevé en 48 h expire ; annulé, refusé ou expiré, la mise est rendue au créateur.
-- Les éclats sont tenus par le jeu (sauvegarde) ; le serveur tient les défis, les tirages et les gains.

-- ——— Cartes (même table que le Tirage des Ombres) ————————————————————————
create table if not exists public.shadow_cards (
  id text primary key,
  rarity text not null,
  faction text not null,
  variants text[] not null default '{}'
);
alter table public.shadow_cards enable row level security;
revoke all on public.shadow_cards from anon, authenticated;
insert into public.shadow_cards (id, rarity, faction, variants) values
('ABY-001','C','abyssal','{holo,gold,galaxy}'),
('ABY-002','C','abyssal','{holo,gold,galaxy}'),
('ABY-003','C','abyssal','{holo,gold,galaxy}'),
('ABY-004','C','abyssal','{holo,gold,galaxy}'),
('ABY-005','C','abyssal','{holo,gold,galaxy}'),
('ABY-006','C','abyssal','{holo,gold,galaxy}'),
('ABY-007','PC','abyssal','{holo,gold,galaxy}'),
('ABY-008','C','abyssal','{holo,gold,galaxy}'),
('ABY-009','C','abyssal','{holo,gold,galaxy}'),
('ABY-010','C','abyssal','{holo,gold,galaxy}'),
('ABY-011','C','abyssal','{holo,gold,galaxy}'),
('ABY-012','C','abyssal','{holo,gold,galaxy}'),
('ABY-013','C','abyssal','{holo,gold,galaxy}'),
('ABY-014','C','abyssal','{holo,gold,galaxy}'),
('ABY-015','C','abyssal','{holo,gold,galaxy}'),
('ABY-016','C','abyssal','{holo,gold,galaxy}'),
('ABY-017','PC','abyssal','{holo,gold,galaxy}'),
('ABY-018','PC','abyssal','{holo,gold,galaxy}'),
('ABY-019','PC','abyssal','{holo,gold,galaxy}'),
('ABY-020','PC','abyssal','{holo,gold,galaxy}'),
('ABY-021','PC','abyssal','{holo,gold,galaxy}'),
('ABY-022','PC','abyssal','{holo,gold,galaxy}'),
('ABY-023','PC','abyssal','{holo,gold,galaxy}'),
('ABY-024','PC','abyssal','{holo,gold,galaxy}'),
('ABY-025','PC','abyssal','{holo,gold,galaxy}'),
('ABY-026','PC','abyssal','{holo,gold,galaxy}'),
('ABY-027','PC','abyssal','{holo,gold,galaxy}'),
('ABY-028','C','abyssal','{holo,gold,galaxy}'),
('ABY-029','PC','abyssal','{holo,gold,galaxy}'),
('ABY-030','R','abyssal','{holo,galaxy,gold}'),
('ABY-031','R','abyssal','{holo,galaxy,gold}'),
('ABY-032','R','abyssal','{holo,galaxy,gold}'),
('ABY-033','R','abyssal','{holo,galaxy,gold}'),
('ABY-034','R','abyssal','{holo,galaxy,gold}'),
('ABY-035','R','abyssal','{holo,galaxy,gold}'),
('ABY-036','R','abyssal','{holo,galaxy,gold}'),
('ABY-037','R','abyssal','{holo,galaxy,gold}'),
('ABY-038','R','abyssal','{holo,galaxy,gold}'),
('ABY-039','HR','abyssal','{holo,galaxy,gold}'),
('ABY-040','HR','abyssal','{holo,galaxy,gold}'),
('ABY-041','HR','abyssal','{holo,galaxy,gold}'),
('ABY-042','HR','abyssal','{holo,galaxy,gold}'),
('ABY-043','HR','abyssal','{holo,galaxy,gold}'),
('ABY-044','HR','abyssal','{holo,galaxy,gold}'),
('ABY-045','M','abyssal','{holo,galaxy,gold}'),
('ABY-046','M','abyssal','{holo,galaxy,gold}'),
('ABY-047','M','abyssal','{holo,galaxy,gold}'),
('ABY-048','S','abyssal','{holo,galaxy,gold}'),
('ABY-049','M','abyssal','{holo,galaxy,gold}'),
('ABY-051','R','abyssal','{holo,galaxy,gold}'),
('ABY-052','HR','abyssal','{holo,galaxy,gold}'),
('ABY-053','R','abyssal','{holo,galaxy,gold}'),
('ABY-054','M','abyssal','{holo,galaxy,gold}'),
('ABY-055','PC','abyssal','{holo,galaxy,gold}'),
('ABY-056','C','abyssal','{holo,galaxy,gold}'),
('ABY-057','C','abyssal','{holo,galaxy,gold}'),
('ABY-058','PC','abyssal','{holo,galaxy,gold}'),
('ABY-059','R','abyssal','{holo,galaxy,gold}'),
('ABY-060','R','abyssal','{holo,galaxy,gold}'),
('ABY-061','HR','abyssal','{holo,galaxy,gold}'),
('ABY-062','PC','abyssal','{holo,galaxy,gold}'),
('ABY-063','R','abyssal','{holo,galaxy,gold}'),
('ABY-064','C','abyssal','{holo,galaxy,gold}'),
('ABY-065','PC','abyssal','{holo,galaxy,gold}'),
('ABY-066','C','abyssal','{holo,galaxy,gold}'),
('ABY-067','M','abyssal','{holo,galaxy,gold}'),
('ABY-068','HR','abyssal','{holo,galaxy,gold}'),
('ABY-069','R','abyssal','{holo,galaxy,gold}'),
('ABY-070','C','abyssal','{holo,galaxy,gold}'),
('ABY-071','R','abyssal','{holo,galaxy,gold}'),
('ABY-072','PC','abyssal','{holo,galaxy,gold}'),
('ABY-073','M','abyssal','{holo,galaxy,gold}'),
('ART-001','C','artificiel','{holo,gold,galaxy}'),
('ART-002','C','artificiel','{holo,gold,galaxy}'),
('ART-003','C','artificiel','{holo,gold,galaxy}'),
('ART-004','C','artificiel','{holo,gold,galaxy}'),
('ART-005','C','artificiel','{holo,gold,galaxy}'),
('ART-006','C','artificiel','{holo,gold,galaxy}'),
('ART-007','C','artificiel','{holo,gold,galaxy}'),
('ART-008','C','artificiel','{holo,gold,galaxy}'),
('ART-009','C','artificiel','{holo,gold,galaxy}'),
('ART-010','C','artificiel','{holo,gold,galaxy}'),
('ART-011','C','artificiel','{holo,gold,galaxy}'),
('ART-012','C','artificiel','{holo,gold,galaxy}'),
('ART-013','C','artificiel','{holo,gold,galaxy}'),
('ART-014','C','artificiel','{holo,gold,galaxy}'),
('ART-015','C','artificiel','{holo,gold,galaxy}'),
('ART-016','C','artificiel','{holo,gold,galaxy}'),
('ART-017','PC','artificiel','{holo,gold,galaxy}'),
('ART-018','PC','artificiel','{holo,gold,galaxy}'),
('ART-019','PC','artificiel','{holo,gold,galaxy}'),
('ART-020','PC','artificiel','{holo,gold,galaxy}'),
('ART-021','PC','artificiel','{holo,gold,galaxy}'),
('ART-022','PC','artificiel','{holo,gold,galaxy}'),
('ART-023','PC','artificiel','{holo,gold,galaxy}'),
('ART-024','PC','artificiel','{holo,gold,galaxy}'),
('ART-025','PC','artificiel','{holo,gold,galaxy}'),
('ART-026','PC','artificiel','{holo,gold,galaxy}'),
('ART-027','R','artificiel','{holo,galaxy,gold}'),
('ART-028','R','artificiel','{holo,galaxy,gold}'),
('ART-029','R','artificiel','{holo,galaxy,gold}'),
('ART-030','R','artificiel','{holo,galaxy,gold}'),
('ART-031','R','artificiel','{holo,galaxy,gold}'),
('ART-032','R','artificiel','{holo,galaxy,gold}'),
('ART-033','R','artificiel','{holo,galaxy,gold}'),
('ART-034','R','artificiel','{holo,galaxy,gold}'),
('ART-035','HR','artificiel','{holo,galaxy,gold}'),
('ART-036','HR','artificiel','{holo,galaxy,gold}'),
('ART-037','HR','artificiel','{holo,galaxy,gold}'),
('ART-038','HR','artificiel','{holo,galaxy,gold}'),
('ART-039','M','artificiel','{holo,galaxy,gold}'),
('ART-040','M','artificiel','{holo,galaxy,gold}'),
('ART-041','S','artificiel','{holo,galaxy,gold}'),
('ART-042','R','artificiel','{holo,galaxy,gold}'),
('ART-043','R','artificiel','{holo,galaxy,gold}'),
('ART-044','HR','artificiel','{holo,galaxy,gold}'),
('ART-045','C','artificiel','{holo,galaxy,gold}'),
('ART-046','M','artificiel','{holo,galaxy,gold}'),
('ART-047','C','artificiel','{holo,galaxy,gold}'),
('ART-048','C','artificiel','{holo,galaxy,gold}'),
('ART-049','PC','artificiel','{holo,galaxy,gold}'),
('ART-050','R','artificiel','{holo,galaxy,gold}'),
('ART-051','C','artificiel','{holo,galaxy,gold}'),
('ART-052','R','artificiel','{holo,galaxy,gold}'),
('ART-053','C','artificiel','{holo,galaxy,gold}'),
('ART-054','C','artificiel','{holo,galaxy,gold}'),
('ART-055','HR','artificiel','{holo,galaxy,gold}'),
('ART-056','HR','artificiel','{holo,galaxy,gold}'),
('ART-057','PC','artificiel','{holo,galaxy,gold}'),
('ART-058','C','artificiel','{holo,galaxy,gold}'),
('ART-059','PC','artificiel','{holo,galaxy,gold}'),
('ART-060','M','artificiel','{holo,galaxy,gold}'),
('ART-061','HR','artificiel','{holo,galaxy,gold}'),
('ART-062','R','artificiel','{holo,galaxy,gold}'),
('ART-063','PC','artificiel','{holo,galaxy,gold}'),
('ART-064','C','artificiel','{holo,galaxy,gold}'),
('ART-065','R','artificiel','{holo,galaxy,gold}'),
('ART-066','PC','artificiel','{holo,galaxy,gold}'),
('ART-067','R','artificiel','{holo,galaxy,gold}'),
('ART-068','M','artificiel','{holo,galaxy,gold}'),
('ART-069','PC','artificiel','{holo,galaxy,gold}'),
('ART-070','HR','artificiel','{holo,galaxy,gold}'),
('ART-071','C','artificiel','{holo,galaxy,gold}'),
('CEL-001','C','celeste','{holo,gold,galaxy}'),
('CEL-002','C','celeste','{holo,gold,galaxy}'),
('CEL-003','C','celeste','{holo,gold,galaxy}'),
('CEL-004','C','celeste','{holo,gold,galaxy}'),
('CEL-005','C','celeste','{holo,gold,galaxy}'),
('CEL-006','C','celeste','{holo,gold,galaxy}'),
('CEL-007','PC','celeste','{holo,gold,galaxy}'),
('CEL-008','C','celeste','{holo,gold,galaxy}'),
('CEL-009','C','celeste','{holo,gold,galaxy}'),
('CEL-010','C','celeste','{holo,gold,galaxy}'),
('CEL-011','C','celeste','{holo,gold,galaxy}'),
('CEL-012','C','celeste','{holo,gold,galaxy}'),
('CEL-013','C','celeste','{holo,gold,galaxy}'),
('CEL-014','C','celeste','{holo,gold,galaxy}'),
('CEL-015','C','celeste','{holo,gold,galaxy}'),
('CEL-016','C','celeste','{holo,gold,galaxy}'),
('CEL-017','PC','celeste','{holo,gold,galaxy}'),
('CEL-018','PC','celeste','{holo,gold,galaxy}'),
('CEL-019','PC','celeste','{holo,gold,galaxy}'),
('CEL-020','PC','celeste','{holo,gold,galaxy}'),
('CEL-021','PC','celeste','{holo,gold,galaxy}'),
('CEL-022','PC','celeste','{holo,gold,galaxy}'),
('CEL-023','PC','celeste','{holo,gold,galaxy}'),
('CEL-024','PC','celeste','{holo,gold,galaxy}'),
('CEL-025','PC','celeste','{holo,gold,galaxy}'),
('CEL-026','C','celeste','{holo,gold,galaxy}'),
('CEL-027','PC','celeste','{holo,gold,galaxy}'),
('CEL-028','PC','celeste','{holo,gold,galaxy}'),
('CEL-029','R','celeste','{holo,galaxy,gold}'),
('CEL-030','R','celeste','{holo,galaxy,gold}'),
('CEL-031','R','celeste','{holo,galaxy,gold}'),
('CEL-032','R','celeste','{holo,galaxy,gold}'),
('CEL-033','R','celeste','{holo,galaxy,gold}'),
('CEL-034','R','celeste','{holo,galaxy,gold}'),
('CEL-035','HR','celeste','{holo,galaxy,gold}'),
('CEL-036','R','celeste','{holo,galaxy,gold}'),
('CEL-037','R','celeste','{holo,galaxy,gold}'),
('CEL-038','HR','celeste','{holo,galaxy,gold}'),
('CEL-039','HR','celeste','{holo,galaxy,gold}'),
('CEL-040','HR','celeste','{holo,galaxy,gold}'),
('CEL-041','HR','celeste','{holo,galaxy,gold}'),
('CEL-042','R','celeste','{holo,galaxy,gold}'),
('CEL-043','M','celeste','{holo,galaxy,gold}'),
('CEL-044','M','celeste','{holo,galaxy,gold}'),
('CEL-045','S','celeste','{holo,galaxy,gold}'),
('CEL-047','HR','celeste','{holo,galaxy,gold}'),
('CEL-048','R','celeste','{holo,galaxy,gold}'),
('CEL-049','R','celeste','{holo,galaxy,gold}'),
('CEL-050','PC','celeste','{holo,gold,galaxy}'),
('CEL-051','R','celeste','{holo,galaxy,gold}'),
('CEL-052','R','celeste','{holo,galaxy,gold}'),
('CEL-053','M','celeste','{holo,galaxy,gold}'),
('CEL-054','HR','celeste','{holo,galaxy,gold}'),
('CEL-055','M','celeste','{holo,galaxy,gold}'),
('CEL-056','S','celeste','{holo,galaxy,gold}'),
('CEL-057','M','celeste','{holo,galaxy,gold}'),
('CEL-058','HR','celeste','{holo,galaxy,gold}'),
('CEL-059','PC','celeste','{holo,galaxy,gold}'),
('CEL-060','R','celeste','{holo,galaxy,gold}'),
('CEL-061','R','celeste','{holo,galaxy,gold}'),
('CEL-062','C','celeste','{holo,galaxy,gold}'),
('CEL-063','HR','celeste','{holo,galaxy,gold}'),
('CEL-064','S','celeste','{holo,galaxy,gold}'),
('CEL-065','HR','celeste','{holo,galaxy,gold}'),
('CEL-066','HR','celeste','{holo,galaxy,gold}'),
('CEL-067','C','celeste','{holo,galaxy,gold}'),
('CEL-068','R','celeste','{holo,galaxy,gold}'),
('CEL-069','R','celeste','{holo,galaxy,gold}'),
('CEL-070','R','celeste','{holo,galaxy,gold}'),
('CEL-071','R','celeste','{holo,galaxy,gold}'),
('CEL-072','PC','celeste','{holo,galaxy,gold}'),
('CEL-073','M','celeste','{holo,galaxy,gold}'),
('INF-001','C','infernal','{holo,gold,galaxy}'),
('INF-002','C','infernal','{holo,gold,galaxy}'),
('INF-003','C','infernal','{holo,gold,galaxy}'),
('INF-004','C','infernal','{holo,gold,galaxy}'),
('INF-005','C','infernal','{holo,gold,galaxy}'),
('INF-006','C','infernal','{holo,gold,galaxy}'),
('INF-007','C','infernal','{holo,gold,galaxy}'),
('INF-008','C','infernal','{holo,gold,galaxy}'),
('INF-009','C','infernal','{holo,gold,galaxy}'),
('INF-010','C','infernal','{holo,gold,galaxy}'),
('INF-011','C','infernal','{holo,gold,galaxy}'),
('INF-012','PC','infernal','{holo,gold,galaxy}'),
('INF-013','C','infernal','{holo,gold,galaxy}'),
('INF-014','C','infernal','{holo,gold,galaxy}'),
('INF-015','C','infernal','{holo,gold,galaxy}'),
('INF-016','C','infernal','{holo,gold,galaxy}'),
('INF-017','C','infernal','{holo,gold,galaxy}'),
('INF-018','PC','infernal','{holo,gold,galaxy}'),
('INF-019','PC','infernal','{holo,gold,galaxy}'),
('INF-020','PC','infernal','{holo,gold,galaxy}'),
('INF-021','PC','infernal','{holo,gold,galaxy}'),
('INF-022','PC','infernal','{holo,gold,galaxy}'),
('INF-023','PC','infernal','{holo,gold,galaxy}'),
('INF-024','PC','infernal','{holo,gold,galaxy}'),
('INF-025','PC','infernal','{holo,gold,galaxy}'),
('INF-026','PC','infernal','{holo,gold,galaxy}'),
('INF-027','PC','infernal','{holo,gold,galaxy}'),
('INF-028','PC','infernal','{holo,gold,galaxy}'),
('INF-029','PC','infernal','{holo,gold,galaxy}'),
('INF-030','PC','infernal','{holo,gold,galaxy}'),
('INF-031','PC','infernal','{holo,gold,galaxy}'),
('INF-032','C','infernal','{holo,gold,galaxy}'),
('INF-033','R','infernal','{holo,galaxy,gold}'),
('INF-034','R','infernal','{holo,galaxy,gold}'),
('INF-035','R','infernal','{holo,galaxy,gold}'),
('INF-036','R','infernal','{holo,galaxy,gold}'),
('INF-037','R','infernal','{holo,galaxy,gold}'),
('INF-038','R','infernal','{holo,galaxy,gold}'),
('INF-039','R','infernal','{holo,galaxy,gold}'),
('INF-040','R','infernal','{holo,galaxy,gold}'),
('INF-041','R','infernal','{holo,galaxy,gold}'),
('INF-042','R','infernal','{holo,galaxy,gold}'),
('INF-043','HR','infernal','{holo,galaxy,gold}'),
('INF-044','HR','infernal','{holo,galaxy,gold}'),
('INF-045','HR','infernal','{holo,galaxy,gold}'),
('INF-046','HR','infernal','{holo,galaxy,gold}'),
('INF-047','HR','infernal','{holo,galaxy,gold}'),
('INF-048','R','infernal','{holo,galaxy,gold}'),
('INF-049','HR','infernal','{holo,galaxy,gold}'),
('INF-050','HR','infernal','{holo,galaxy,gold}'),
('INF-051','M','infernal','{holo,galaxy,gold}'),
('INF-052','M','infernal','{holo,galaxy,gold}'),
('INF-053','M','infernal','{holo,galaxy,gold}'),
('INF-054','S','infernal','{holo,galaxy,gold}'),
('INF-055','HR','infernal','{holo,galaxy,gold}'),
('INF-056','R','infernal','{holo,galaxy,gold}'),
('INF-057','R','infernal','{holo,galaxy,gold}'),
('INF-058','R','infernal','{holo,galaxy,gold}'),
('INF-059','PC','infernal','{holo,gold,galaxy}'),
('INF-060','PC','infernal','{holo,gold,galaxy}'),
('INF-061','R','infernal','{holo,galaxy,gold}'),
('INF-062','R','infernal','{holo,galaxy,gold}'),
('INF-063','PC','infernal','{holo,gold,galaxy}'),
('INF-064','R','infernal','{holo,galaxy,gold}'),
('INF-065','HR','infernal','{holo,galaxy,gold}'),
('INF-066','HR','infernal','{holo,galaxy,gold}'),
('INF-067','HR','infernal','{holo,galaxy,gold}'),
('INF-068','HR','infernal','{holo,galaxy,gold}'),
('INF-069','R','infernal','{holo,galaxy,gold}'),
('INF-070','R','infernal','{holo,galaxy,gold}'),
('INF-071','M','infernal','{holo,galaxy,gold}'),
('INF-072','PC','infernal','{holo,galaxy,gold}'),
('INF-073','M','infernal','{holo,galaxy,gold}'),
('NEC-001','C','necrotique','{holo,gold,galaxy}'),
('NEC-002','C','necrotique','{holo,gold,galaxy}'),
('NEC-003','C','necrotique','{holo,gold,galaxy}'),
('NEC-004','C','necrotique','{holo,gold,galaxy}'),
('NEC-005','C','necrotique','{holo,gold,galaxy}'),
('NEC-006','PC','necrotique','{holo,gold,galaxy}'),
('NEC-007','C','necrotique','{holo,gold,galaxy}'),
('NEC-008','C','necrotique','{holo,gold,galaxy}'),
('NEC-009','C','necrotique','{holo,gold,galaxy}'),
('NEC-010','C','necrotique','{holo,gold,galaxy}'),
('NEC-011','C','necrotique','{holo,gold,galaxy}'),
('NEC-012','C','necrotique','{holo,gold,galaxy}'),
('NEC-013','C','necrotique','{holo,gold,galaxy}'),
('NEC-014','C','necrotique','{holo,gold,galaxy}'),
('NEC-015','C','necrotique','{holo,gold,galaxy}'),
('NEC-016','C','necrotique','{holo,gold,galaxy}'),
('NEC-017','PC','necrotique','{holo,gold,galaxy}'),
('NEC-018','PC','necrotique','{holo,gold,galaxy}'),
('NEC-019','PC','necrotique','{holo,gold,galaxy}'),
('NEC-020','PC','necrotique','{holo,gold,galaxy}'),
('NEC-021','PC','necrotique','{holo,gold,galaxy}'),
('NEC-022','PC','necrotique','{holo,gold,galaxy}'),
('NEC-023','PC','necrotique','{holo,gold,galaxy}'),
('NEC-024','C','necrotique','{holo,gold,galaxy}'),
('NEC-025','PC','necrotique','{holo,gold,galaxy}'),
('NEC-026','PC','necrotique','{holo,gold,galaxy}'),
('NEC-027','PC','necrotique','{holo,gold,galaxy}'),
('NEC-028','R','necrotique','{holo,galaxy,gold}'),
('NEC-029','R','necrotique','{holo,galaxy,gold}'),
('NEC-030','R','necrotique','{holo,galaxy,gold}'),
('NEC-031','R','necrotique','{holo,galaxy,gold}'),
('NEC-032','R','necrotique','{holo,galaxy,gold}'),
('NEC-033','R','necrotique','{holo,galaxy,gold}'),
('NEC-034','R','necrotique','{holo,galaxy,gold}'),
('NEC-035','R','necrotique','{holo,galaxy,gold}'),
('NEC-036','R','necrotique','{holo,galaxy,gold}'),
('NEC-037','HR','necrotique','{holo,galaxy,gold}'),
('NEC-038','HR','necrotique','{holo,galaxy,gold}'),
('NEC-039','HR','necrotique','{holo,galaxy,gold}'),
('NEC-040','HR','necrotique','{holo,galaxy,gold}'),
('NEC-041','HR','necrotique','{holo,galaxy,gold}'),
('NEC-042','M','necrotique','{holo,galaxy,gold}'),
('NEC-043','M','necrotique','{holo,galaxy,gold}'),
('NEC-044','S','necrotique','{holo,galaxy,gold}'),
('NEC-045','C','necrotique','{holo,gold,galaxy}'),
('NEC-046','C','necrotique','{holo,gold,galaxy}'),
('NEC-047','PC','necrotique','{holo,gold,galaxy}'),
('NEC-048','HR','necrotique','{holo,galaxy,gold}'),
('NEC-049','PC','necrotique','{holo,gold,galaxy}'),
('NEC-050','R','necrotique','{holo,galaxy,gold}'),
('NEC-051','PC','necrotique','{holo,gold,galaxy}'),
('NEC-052','C','necrotique','{holo,gold,galaxy}'),
('NEC-053','C','necrotique','{holo,gold,galaxy}'),
('NEC-054','R','necrotique','{holo,galaxy,gold}'),
('NEC-055','C','necrotique','{holo,gold,galaxy}'),
('NEC-056','R','necrotique','{holo,galaxy,gold}'),
('NEC-057','M','necrotique','{holo,galaxy,gold}'),
('NEC-058','R','necrotique','{holo,galaxy,gold}'),
('NEC-059','PC','necrotique','{holo,galaxy,gold}'),
('NEC-060','R','necrotique','{holo,galaxy,gold}'),
('NEC-061','M','necrotique','{holo,galaxy,gold}'),
('NEC-062','HR','necrotique','{holo,galaxy,gold}'),
('NEC-063','HR','necrotique','{holo,galaxy,gold}'),
('NEC-064','C','necrotique','{holo,galaxy,gold}'),
('NEC-065','PC','necrotique','{holo,galaxy,gold}'),
('NEC-066','M','necrotique','{holo,galaxy,gold}'),
('NEC-067','R','necrotique','{holo,galaxy,gold}'),
('NEC-068','PC','necrotique','{holo,galaxy,gold}'),
('NEC-069','C','necrotique','{holo,galaxy,gold}'),
('NEC-070','HR','necrotique','{holo,galaxy,gold}'),
('NEC-071','HR','necrotique','{holo,galaxy,gold}'),
('NEC-072','M','necrotique','{holo,galaxy,gold}'),
('PRI-001','C','primordial','{holo,gold,galaxy}'),
('PRI-002','C','primordial','{holo,gold,galaxy}'),
('PRI-003','C','primordial','{holo,gold,galaxy}'),
('PRI-004','PC','primordial','{holo,gold,galaxy}'),
('PRI-005','C','primordial','{holo,gold,galaxy}'),
('PRI-006','C','primordial','{holo,gold,galaxy}'),
('PRI-007','C','primordial','{holo,gold,galaxy}'),
('PRI-008','C','primordial','{holo,gold,galaxy}'),
('PRI-009','C','primordial','{holo,gold,galaxy}'),
('PRI-010','PC','primordial','{holo,gold,galaxy}'),
('PRI-011','C','primordial','{holo,gold,galaxy}'),
('PRI-012','C','primordial','{holo,gold,galaxy}'),
('PRI-013','C','primordial','{holo,gold,galaxy}'),
('PRI-014','PC','primordial','{holo,gold,galaxy}'),
('PRI-015','PC','primordial','{holo,gold,galaxy}'),
('PRI-016','PC','primordial','{holo,gold,galaxy}'),
('PRI-017','PC','primordial','{holo,gold,galaxy}'),
('PRI-018','PC','primordial','{holo,gold,galaxy}'),
('PRI-019','PC','primordial','{holo,gold,galaxy}'),
('PRI-020','PC','primordial','{holo,gold,galaxy}'),
('PRI-021','PC','primordial','{holo,gold,galaxy}'),
('PRI-022','PC','primordial','{holo,gold,galaxy}'),
('PRI-023','PC','primordial','{holo,gold,galaxy}'),
('PRI-024','C','primordial','{holo,gold,galaxy}'),
('PRI-025','R','primordial','{holo,galaxy,gold}'),
('PRI-026','R','primordial','{holo,galaxy,gold}'),
('PRI-027','R','primordial','{holo,galaxy,gold}'),
('PRI-028','R','primordial','{holo,galaxy,gold}'),
('PRI-029','R','primordial','{holo,galaxy,gold}'),
('PRI-030','R','primordial','{holo,galaxy,gold}'),
('PRI-031','R','primordial','{holo,galaxy,gold}'),
('PRI-032','R','primordial','{holo,galaxy,gold}'),
('PRI-033','R','primordial','{holo,galaxy,gold}'),
('PRI-034','R','primordial','{holo,galaxy,gold}'),
('PRI-035','R','primordial','{holo,galaxy,gold}'),
('PRI-036','R','primordial','{holo,galaxy,gold}'),
('PRI-037','R','primordial','{holo,galaxy,gold}'),
('PRI-038','HR','primordial','{holo,galaxy,gold}'),
('PRI-039','HR','primordial','{holo,galaxy,gold}'),
('PRI-040','HR','primordial','{holo,galaxy,gold}'),
('PRI-041','HR','primordial','{holo,galaxy,gold}'),
('PRI-042','HR','primordial','{holo,galaxy,gold}'),
('PRI-043','HR','primordial','{holo,galaxy,gold}'),
('PRI-044','HR','primordial','{holo,galaxy,gold}'),
('PRI-045','HR','primordial','{holo,galaxy,gold}'),
('PRI-046','HR','primordial','{holo,galaxy,gold}'),
('PRI-047','HR','primordial','{holo,galaxy,gold}'),
('PRI-048','M','primordial','{holo,galaxy,gold}'),
('PRI-049','M','primordial','{holo,galaxy,gold}'),
('PRI-050','M','primordial','{holo,galaxy,gold}'),
('PRI-051','M','primordial','{holo,galaxy,gold}'),
('PRI-052','M','primordial','{holo,galaxy,gold}'),
('PRI-053','S','primordial','{holo,galaxy,gold}'),
('PRI-054','R','primordial','{holo,galaxy,gold}'),
('PRI-055','M','primordial','{holo,galaxy,gold}'),
('PRI-056','HR','primordial','{holo,galaxy,gold}'),
('PRI-057','R','primordial','{holo,galaxy,gold}'),
('PRI-058','M','primordial','{holo,galaxy,gold}'),
('PRI-059','R','primordial','{holo,galaxy,gold}'),
('PRI-060','HR','primordial','{holo,galaxy,gold}'),
('PRI-061','HR','primordial','{holo,galaxy,gold}'),
('PRI-062','R','primordial','{holo,galaxy,gold}'),
('PRI-063','R','primordial','{holo,galaxy,gold}'),
('PRI-064','HR','primordial','{holo,galaxy,gold}'),
('PRI-065','R','primordial','{holo,galaxy,gold}'),
('PRI-066','R','primordial','{holo,galaxy,gold}'),
('PRI-067','HR','primordial','{holo,galaxy,gold}'),
('PRI-068','M','primordial','{holo,galaxy,gold}'),
('PRI-069','HR','primordial','{holo,galaxy,gold}'),
('PRI-070','HR','primordial','{holo,galaxy,gold}'),
('PRI-071','S','primordial','{holo,galaxy,gold}'),
('PRI-072','M','primordial','{holo,galaxy,gold}'),
('SAU-001','C','sauvage','{holo,gold,galaxy}'),
('SAU-002','C','sauvage','{holo,gold,galaxy}'),
('SAU-003','C','sauvage','{holo,gold,galaxy}'),
('SAU-004','C','sauvage','{holo,gold,galaxy}'),
('SAU-005','C','sauvage','{holo,gold,galaxy}'),
('SAU-006','C','sauvage','{holo,gold,galaxy}'),
('SAU-007','C','sauvage','{holo,gold,galaxy}'),
('SAU-008','C','sauvage','{holo,gold,galaxy}'),
('SAU-009','PC','sauvage','{holo,gold,galaxy}'),
('SAU-010','C','sauvage','{holo,gold,galaxy}'),
('SAU-011','C','sauvage','{holo,gold,galaxy}'),
('SAU-012','C','sauvage','{holo,gold,galaxy}'),
('SAU-013','C','sauvage','{holo,gold,galaxy}'),
('SAU-014','C','sauvage','{holo,gold,galaxy}'),
('SAU-015','C','sauvage','{holo,gold,galaxy}'),
('SAU-016','PC','sauvage','{holo,gold,galaxy}'),
('SAU-017','C','sauvage','{holo,gold,galaxy}'),
('SAU-018','PC','sauvage','{holo,gold,galaxy}'),
('SAU-019','PC','sauvage','{holo,gold,galaxy}'),
('SAU-020','PC','sauvage','{holo,gold,galaxy}'),
('SAU-021','C','sauvage','{holo,gold,galaxy}'),
('SAU-022','PC','sauvage','{holo,gold,galaxy}'),
('SAU-023','PC','sauvage','{holo,gold,galaxy}'),
('SAU-024','PC','sauvage','{holo,gold,galaxy}'),
('SAU-025','PC','sauvage','{holo,gold,galaxy}'),
('SAU-026','PC','sauvage','{holo,gold,galaxy}'),
('SAU-027','PC','sauvage','{holo,gold,galaxy}'),
('SAU-028','PC','sauvage','{holo,gold,galaxy}'),
('SAU-029','C','sauvage','{holo,gold,galaxy}'),
('SAU-030','PC','sauvage','{holo,gold,galaxy}'),
('SAU-031','R','sauvage','{holo,galaxy,gold}'),
('SAU-032','R','sauvage','{holo,galaxy,gold}'),
('SAU-033','R','sauvage','{holo,galaxy,gold}'),
('SAU-034','R','sauvage','{holo,galaxy,gold}'),
('SAU-035','R','sauvage','{holo,galaxy,gold}'),
('SAU-036','R','sauvage','{holo,galaxy,gold}'),
('SAU-037','R','sauvage','{holo,galaxy,gold}'),
('SAU-038','HR','sauvage','{holo,galaxy,gold}'),
('SAU-039','R','sauvage','{holo,galaxy,gold}'),
('SAU-040','R','sauvage','{holo,galaxy,gold}'),
('SAU-041','HR','sauvage','{holo,galaxy,gold}'),
('SAU-042','HR','sauvage','{holo,galaxy,gold}'),
('SAU-043','HR','sauvage','{holo,galaxy,gold}'),
('SAU-044','HR','sauvage','{holo,galaxy,gold}'),
('SAU-045','HR','sauvage','{holo,galaxy,gold}'),
('SAU-046','HR','sauvage','{holo,galaxy,gold}'),
('SAU-047','R','sauvage','{holo,galaxy,gold}'),
('SAU-048','M','sauvage','{holo,galaxy,gold}'),
('SAU-049','M','sauvage','{holo,galaxy,gold}'),
('SAU-050','S','sauvage','{holo,galaxy,gold}'),
('SAU-051','R','sauvage','{holo,galaxy,gold}'),
('SAU-052','PC','sauvage','{holo,gold,galaxy}'),
('SAU-053','C','sauvage','{holo,gold,galaxy}'),
('SAU-054','R','sauvage','{holo,galaxy,gold}'),
('SAU-055','R','sauvage','{holo,galaxy,gold}'),
('SAU-056','PC','sauvage','{holo,gold,galaxy}'),
('SAU-057','PC','sauvage','{holo,gold,galaxy}'),
('SAU-058','C','sauvage','{holo,gold,galaxy}'),
('SAU-059','PC','sauvage','{holo,gold,galaxy}'),
('SAU-060','HR','sauvage','{holo,galaxy,gold}'),
('SAU-061','R','sauvage','{holo,galaxy,gold}'),
('SAU-062','PC','sauvage','{holo,gold,galaxy}'),
('SAU-063','HR','sauvage','{holo,galaxy,gold}'),
('SAU-064','R','sauvage','{holo,galaxy,gold}'),
('SAU-065','PC','sauvage','{holo,galaxy,gold}'),
('SAU-066','R','sauvage','{holo,galaxy,gold}'),
('SAU-067','PC','sauvage','{holo,galaxy,gold}'),
('SAU-068','C','sauvage','{holo,galaxy,gold}'),
('SAU-069','R','sauvage','{holo,galaxy,gold}'),
('SAU-070','PC','sauvage','{holo,galaxy,gold}'),
('SAU-071','C','sauvage','{holo,galaxy,gold}'),
('SAU-072','HR','sauvage','{holo,galaxy,gold}'),
('SAU-073','PC','sauvage','{holo,galaxy,gold}'),
('SAU-074','M','sauvage','{holo,galaxy,gold}')
on conflict (id) do update set rarity = excluded.rarity, faction = excluded.faction, variants = excluded.variants;

-- ——— Défis ————————————————————————————————————————————————————————————
create table if not exists public.versus_duels (
  id uuid primary key default gen_random_uuid(),
  a uuid not null references public.profiles(id) on delete cascade,      -- celui qui lance le défi
  b uuid references public.profiles(id) on delete cascade,               -- l'ami défié, ou celui qui relève
  public boolean not null default true,
  type text not null check (type in ('standard', 'faction', 'event', 'premium')),
  faction text,
  factions text[],
  packs int not null check (packs between 1 and 3),
  stake int not null,                                                    -- éclats misés par chaque joueur
  status text not null default 'open' check (status in ('open', 'done', 'cancelled', 'declined', 'expired')),
  a_cards jsonb, b_cards jsonb, a_score int, b_score int,
  a_claimed boolean not null default false,
  b_claimed boolean not null default false,
  created_at timestamptz not null default now(),
  done_at timestamptz
);
-- v516 : composition libre (jusqu'à 3 boosters de types différents, les mêmes pour les deux joueurs)
alter table public.versus_duels add column if not exists lineup jsonb;
-- v736 : le gagnant choisit sa carte parmi celles de l'adversaire (index dans ses cartes)
alter table public.versus_duels add column if not exists a_pick int;
alter table public.versus_duels add column if not exists b_pick int;
-- v807 : une réaction laissée par chaque joueur sur le duel ({ a: clé, b: clé }), vue par l'autre quand il regarde le duel
alter table public.versus_duels add column if not exists reacts jsonb;
alter table public.versus_duels drop constraint if exists versus_duels_type_check;
alter table public.versus_duels add constraint versus_duels_type_check check (type in ('standard', 'faction', 'event', 'premium', 'mix'));
create index if not exists versus_open on public.versus_duels (status, created_at desc);
create index if not exists versus_a on public.versus_duels (a, created_at desc);
create index if not exists versus_b on public.versus_duels (b, created_at desc);
alter table public.versus_duels enable row level security;
revoke all on public.versus_duels from anon, authenticated;

-- ——— Tirage d'un booster (mêmes tables que le jeu, sans garantie de pitié) ———————————
create or replace function public.versus_rarity(p_table text)
returns text language plpgsql volatile set search_path = public as $$
declare w jsonb; k text; tot float8 := 0; x float8;
begin
  w := case p_table
    when 'base' then '{"C":74,"PC":20,"R":4.8,"HR":1,"M":0.17,"S":0.03}'::jsonb
    when 'pcPlus' then '{"PC":82,"R":14,"HR":3.3,"M":0.6,"S":0.1}'::jsonb
    when 'event' then '{"C":66,"PC":24,"R":7.5,"HR":2,"M":0.4,"S":0.1}'::jsonb
    when 'rPlus' then '{"R":82,"HR":15,"M":2.6,"S":0.4}'::jsonb
    else null
  end;
  for k in select unnest(array['C','PC','R','HR','M','S']) loop tot := tot + coalesce((w ->> k)::float8, 0); end loop;
  x := random() * tot;
  for k in select unnest(array['C','PC','R','HR','M','S']) loop
    if w ? k then
      if x < (w ->> k)::float8 then return k; end if;
      x := x - (w ->> k)::float8;
    end if;
  end loop;
  return 'S';
end $$;

create or replace function public.versus_pack(p_type text, p_faction text, p_factions text[])
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  slots text[]; mult float8; slot text; r text; i int; c public.shadow_cards%rowtype; v text; x float8; pts int; out jsonb := '[]'::jsonb;
  ord text[] := array['C','PC','R','HR','M','S'];
begin
  case p_type
    when 'standard' then slots := array['base','base','pcPlus']; mult := 1;
    when 'faction' then slots := array['base','base','pcPlus']; mult := 1;
    when 'event' then slots := array['event','event','pcPlus']; mult := 1.5;
    when 'premium' then slots := array['base','pcPlus','rPlus']; mult := 2;
    else raise exception 'Booster inconnu.';
  end case;
  foreach slot in array slots loop
    r := public.versus_rarity(slot);
    c.id := null;
    i := array_position(ord, r);
    while i >= 1 and c.id is null loop
      select * into c from public.shadow_cards s
        where s.rarity = ord[i]
          and (p_type not in ('faction') or s.faction = p_faction)
          and (p_type <> 'event' or s.faction = any(p_factions))
        order by random() limit 1;
      i := i - 1;
    end loop;
    if c.id is null then raise exception 'Aucune carte à tirer.'; end if;
    x := random() * 100; v := 'normal';
    if v = 'normal' and 'holo' = any(c.variants) then if x >= 0 and x < 4 * mult then v := 'holo'; end if; x := x - 4 * mult; end if;
    if v = 'normal' and 'gold' = any(c.variants) then if x >= 0 and x < 1.2 * mult then v := 'gold'; end if; x := x - 1.2 * mult; end if;
    if v = 'normal' and 'galaxy' = any(c.variants) then if x >= 0 and x < 0.4 * mult then v := 'galaxy'; end if; x := x - 0.4 * mult; end if;
    pts := case c.rarity when 'C' then 1 when 'PC' then 2 when 'R' then 6 when 'HR' then 20 when 'M' then 80 when 'S' then 200 else 0 end + case when v = 'normal' then 0 else 8 end;
    out := out || jsonb_build_object('id', c.id, 'rarity', c.rarity, 'variant', v, 'pts', pts);
  end loop;
  return out;
end $$;
revoke execute on function public.versus_rarity(text) from public, anon, authenticated;
revoke execute on function public.versus_pack(text, text, text[]) from public, anon, authenticated;

create or replace function public.versus_score(p jsonb)
returns int language sql immutable as $$ select coalesce(sum((e ->> 'pts')::int), 0)::int from jsonb_array_elements(p) e $$;

-- Défis ouverts depuis plus de 48 h : expirés (mise rendue au créateur à sa prochaine visite)
create or replace function public.versus_expire()
returns void language sql volatile security definer set search_path = public as $$
  update public.versus_duels set status = 'expired' where status = 'open' and created_at < now() - interval '48 hours';
$$;
revoke execute on function public.versus_expire() from public, anon, authenticated;

-- ——— Lancer un défi : renvoie son identifiant ————————————————————————————
create or replace function public.versus_create(p_type text, p_faction text, p_factions text[], p_packs int, p_to uuid default null)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); n int; price int; id uuid;
  facs text[] := array['infernal','abyssal','celeste','sauvage','necrotique','primordial','artificiel'];
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  if not exists (select 1 from public.profiles where profiles.id = me) then raise exception 'Choisis d’abord ton pseudo (Sanctuaire → Compte).'; end if;
  if p_packs is null or p_packs < 1 or p_packs > 3 then raise exception 'De 1 à 3 boosters par défi.'; end if;
  price := case p_type when 'standard' then 400 when 'faction' then 500 when 'event' then 550 when 'premium' then 1000 else null end;
  if price is null then raise exception 'Booster inconnu.'; end if;
  if p_type = 'faction' and (p_faction is null or not (p_faction = any(facs))) then raise exception 'Choisis une faction.'; end if;
  if p_type = 'event' and (coalesce(array_length(p_factions, 1), 0) <> 2 or not (p_factions <@ facs) or p_factions[1] = p_factions[2]) then raise exception 'Alliance inconnue.'; end if;
  if p_to is not null then
    if p_to = me then raise exception 'Tu ne peux pas te défier toi-même.'; end if;
    -- v807 : revanche : aussi un joueur contre qui on vient de jouer un duel (3 jours)
    if not public.are_friends(me, p_to) and not exists (select 1 from public.versus_duels x where x.status = 'done'
        and ((x.a = me and x.b = p_to) or (x.a = p_to and x.b = me)) and x.done_at > now() - interval '3 days') then
      raise exception 'Ce joueur n’est pas ton ami.';
    end if;
  end if;
  perform public.versus_expire();
  select count(*) into n from public.versus_duels where a = me and status = 'open';
  if n >= 5 then raise exception 'Tu as déjà 5 défis en attente : attends qu’on les relève ou annule-en un.'; end if;
  insert into public.versus_duels (a, b, public, type, faction, factions, packs, stake)
  values (me, p_to, p_to is null, p_type, case when p_type = 'faction' then p_faction end, case when p_type = 'event' then p_factions end, p_packs, price * p_packs)
  returning versus_duels.id into id;
  return id;
end $$;

-- ——— v516 : lancer un défi à composition libre : p_lineup = [{type, faction?, factions?}, …] (1 à 3 boosters) ——————
create or replace function public.versus_create_mix(p_lineup jsonb, p_to uuid default null)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); n int; price int := 0; p int; id uuid; it record; ty text; fa text; fs text[]; clean jsonb := '[]'::jsonb; types text[] := '{}';
  facs text[] := array['infernal','abyssal','celeste','sauvage','necrotique','primordial','artificiel'];
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  if not exists (select 1 from public.profiles where profiles.id = me) then raise exception 'Choisis d’abord ton pseudo (Sanctuaire → Compte).'; end if;
  if jsonb_typeof(p_lineup) <> 'array' or jsonb_array_length(p_lineup) < 1 or jsonb_array_length(p_lineup) > 3 then raise exception 'De 1 à 3 boosters par défi.'; end if;
  for it in select * from jsonb_array_elements(p_lineup) loop
    ty := it.value ->> 'type'; fa := null; fs := null;
    p := case ty when 'standard' then 400 when 'faction' then 500 when 'event' then 550 when 'premium' then 1000 else null end;
    if p is null then raise exception 'Booster inconnu.'; end if;
    if ty = 'faction' then
      fa := it.value ->> 'faction';
      if fa is null or not (fa = any(facs)) then raise exception 'Choisis une faction.'; end if;
    end if;
    if ty = 'event' then
      fs := array(select jsonb_array_elements_text(coalesce(it.value -> 'factions', '[]'::jsonb)));
      if coalesce(array_length(fs, 1), 0) <> 2 or not (fs <@ facs) or fs[1] = fs[2] then raise exception 'Alliance inconnue.'; end if;
    end if;
    price := price + p; types := types || ty;
    clean := clean || jsonb_strip_nulls(jsonb_build_object('type', ty, 'faction', fa, 'factions', to_jsonb(fs)));
  end loop;
  if p_to is not null then
    if p_to = me then raise exception 'Tu ne peux pas te défier toi-même.'; end if;
    -- v807 : revanche : aussi un joueur contre qui on vient de jouer un duel (3 jours)
    if not public.are_friends(me, p_to) and not exists (select 1 from public.versus_duels x where x.status = 'done'
        and ((x.a = me and x.b = p_to) or (x.a = p_to and x.b = me)) and x.done_at > now() - interval '3 days') then
      raise exception 'Ce joueur n’est pas ton ami.';
    end if;
  end if;
  perform public.versus_expire();
  select count(*) into n from public.versus_duels where a = me and status = 'open';
  if n >= 5 then raise exception 'Tu as déjà 5 défis en attente : attends qu’on les relève ou annule-en un.'; end if;
  insert into public.versus_duels (a, b, public, type, packs, stake, lineup)
  values (me, p_to, p_to is null, case when (select count(distinct x) from unnest(types) x) = 1 then types[1] else 'mix' end, jsonb_array_length(clean), price, clean)
  returning versus_duels.id into id;
  return id;
end $$;
revoke execute on function public.versus_create_mix(jsonb, uuid) from public, anon;
grant execute on function public.versus_create_mix(jsonb, uuid) to authenticated;

-- ——— Relever un défi : le serveur ouvre les boosters des deux joueurs ——————————————
create or replace function public.versus_accept(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); d public.versus_duels; ca jsonb := '[]'::jsonb; cb jsonb := '[]'::jsonb; k int; it record;
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  if not exists (select 1 from public.profiles where profiles.id = me) then raise exception 'Choisis d’abord ton pseudo (Sanctuaire → Compte).'; end if;
  perform public.versus_expire();
  select * into d from public.versus_duels where id = p_id for update;
  if not found or d.status <> 'open' then raise exception 'Ce défi n’est plus disponible.'; end if;
  if d.a = me then raise exception 'C’est ton propre défi.'; end if;
  if d.b is not null and d.b <> me then raise exception 'Ce défi est réservé à un autre joueur.'; end if;
  if d.lineup is not null then
    for it in select * from jsonb_array_elements(d.lineup) loop
      ca := ca || public.versus_pack(it.value ->> 'type', it.value ->> 'faction', array(select jsonb_array_elements_text(coalesce(it.value -> 'factions', '[]'::jsonb))));
      cb := cb || public.versus_pack(it.value ->> 'type', it.value ->> 'faction', array(select jsonb_array_elements_text(coalesce(it.value -> 'factions', '[]'::jsonb))));
    end loop;
  else
    for k in 1..d.packs loop
      ca := ca || public.versus_pack(d.type, d.faction, d.factions);
      cb := cb || public.versus_pack(d.type, d.faction, d.factions);
    end loop;
  end if;
  update public.versus_duels set b = me, status = 'done', a_cards = ca, b_cards = cb,
    a_score = public.versus_score(ca), b_score = public.versus_score(cb), done_at = now()
  where id = p_id;
  return jsonb_build_object('id', p_id, 'stake', d.stake);
end $$;

-- ——— Annuler (créateur) ou refuser (ami défié) un défi encore ouvert ———————————————
create or replace function public.versus_cancel(p_id uuid)
returns text language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  update public.versus_duels set status = 'cancelled' where id = p_id and a = me and status = 'open';
  if found then return 'cancelled'; end if;
  update public.versus_duels set status = 'declined' where id = p_id and b = me and not public and status = 'open';
  if found then return 'declined'; end if;
  raise exception 'Ce défi n’est plus ouvert.';
end $$;

-- ——— Encaisser un défi (une seule fois par joueur) ————————————————————————————
-- Renvoie { result: 'win' | 'tie' | 'lose' | 'refund' | 'already' | 'wait', cards: [...] } : cartes à ajouter,
-- éclats à rendre (refund = la mise du créateur).
create or replace function public.versus_claim(p_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); d public.versus_duels; mine int; theirs int; res text; cards jsonb := '[]'::jsonb; choices jsonb;
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  perform public.versus_expire();
  select * into d from public.versus_duels where id = p_id and me in (a, b) for update;
  if not found then raise exception 'Défi introuvable.'; end if;
  if (d.a = me and d.a_claimed) or (d.b = me and d.a <> me and d.b_claimed) then
    return jsonb_build_object('result', 'already', 'cards', '[]'::jsonb, 'stake', d.stake);
  end if;
  if d.status = 'open' then return jsonb_build_object('result', 'wait', 'cards', '[]'::jsonb, 'stake', d.stake); end if;
  if d.status in ('cancelled', 'declined', 'expired') then
    if d.a <> me then return jsonb_build_object('result', 'already', 'cards', '[]'::jsonb, 'stake', d.stake); end if;
    update public.versus_duels set a_claimed = true where id = p_id;
    return jsonb_build_object('result', 'refund', 'cards', '[]'::jsonb, 'stake', d.stake);
  end if;
  -- v735 : plus de mise. Chacun garde les cartes de ses propres boosters. v736 : le gagnant choisit ensuite une carte
  -- parmi celles de l'adversaire (versus_pick) ; le jeu donne un coffre abyssal à la place d'une Mythique ou d'une Secrète
  if d.a = me then mine := d.a_score; theirs := d.b_score; else mine := d.b_score; theirs := d.a_score; end if;
  cards := coalesce(case when d.a = me then d.a_cards else d.b_cards end, '[]'::jsonb);
  if mine > theirs then
    res := 'win';
    choices := coalesce(case when d.a = me then d.b_cards else d.a_cards end, '[]'::jsonb);
  elsif mine = theirs then res := 'tie';
  else res := 'lose'; end if;
  if d.a = me then update public.versus_duels set a_claimed = true where id = p_id;
  else update public.versus_duels set b_claimed = true where id = p_id; end if;
  return jsonb_build_object('result', res, 'cards', cards, 'stake', d.stake, 'choices', choices, 'pick', res = 'win',
    'packs', greatest(1, coalesce(jsonb_array_length(d.lineup), d.packs, 1)));
end $$;

-- ——— v736 : butin du gagnant : une carte choisie parmi celles de l'adversaire (une seule fois) ——————————————————
create or replace function public.versus_pick(p_id uuid, p_idx int)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); d public.versus_duels; mine int; theirs int; foe jsonb; c jsonb;
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  select * into d from public.versus_duels where id = p_id and me in (a, b) for update;
  if not found then raise exception 'Défi introuvable.'; end if;
  if d.status <> 'done' then raise exception 'Ce duel n’est pas encore joué.'; end if;
  if d.a = me then mine := d.a_score; theirs := d.b_score; foe := d.b_cards; else mine := d.b_score; theirs := d.a_score; foe := d.a_cards; end if;
  if not (mine > theirs) then raise exception 'Seul le gagnant choisit un butin.'; end if;
  if (d.a = me and d.a_pick is not null) or (d.a <> me and d.b_pick is not null) then raise exception 'Butin déjà choisi.'; end if;
  if p_idx is null or p_idx < 0 or p_idx >= coalesce(jsonb_array_length(foe), 0) then raise exception 'Carte inconnue.'; end if;
  c := foe -> p_idx;
  if d.a = me then update public.versus_duels set a_pick = p_idx where id = p_id;
  else update public.versus_duels set b_pick = p_idx where id = p_id; end if;
  if c->>'rarity' in ('M', 'S') then return jsonb_build_object('trophy', null, 'chest', 'abyssal'); end if;
  -- v807 : le pseudo de l'adversaire (carte trophée : « Gagnée au Choc contre X »)
  return jsonb_build_object('trophy', c, 'chest', null,
    'foe', (select p.pseudo from public.profiles p where p.id = case when d.a = me then d.b else d.a end));
end $$;
revoke execute on function public.versus_pick(uuid, int) from public, anon;
grant execute on function public.versus_pick(uuid, int) to authenticated;

-- ——— Listes : défis ouverts des autres, et mes défis (30 derniers) ————————————————————
-- v565 : apparence de l'adversaire (sachet de booster, cadre, plaque : colonnes aussi créées par 15-vitrine.sql)
alter table public.profiles add column if not exists frame text;
alter table public.profiles add column if not exists plate text;
alter table public.profiles add column if not exists sachet text;
alter table public.profiles add column if not exists choc jsonb; -- v807 : série et ligue du Choc (publiées par le serveur de partie)
create or replace function public.versus_list()
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  perform public.versus_expire();
  return jsonb_build_object(
    'open', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select d.id, d.a, d.type, d.faction, d.factions, d.lineup, d.packs, d.stake, d.created_at, p.pseudo, p.avatar, p.badge, p.title, p.level, p.choc
      from public.versus_duels d join public.profiles p on p.id = d.a
      where d.status = 'open' and d.public and d.a <> me
      order by d.created_at desc limit 40) x), '[]'::jsonb),
    'mine', coalesce((select jsonb_agg(x order by x.created_at desc) from (
      select d.id, d.a, d.b, d.public, d.type, d.faction, d.factions, d.lineup, d.packs, d.stake, d.status, d.created_at, d.done_at,
             (d.a = me) as mine,
             case when d.a = me then d.a_cards else d.b_cards end as my_cards,
             case when d.a = me then d.b_cards else d.a_cards end as their_cards,
             case when d.a = me then d.a_score else d.b_score end as my_score,
             case when d.a = me then d.b_score else d.a_score end as their_score,
             case when d.a = me then d.a_claimed else d.b_claimed end as claimed,
             o.pseudo, o.avatar, o.badge, o.sachet, o.frame, o.plate, o.choc,
             case when d.a = me then d.reacts ->> 'a' else d.reacts ->> 'b' end as my_react,
             case when d.a = me then d.reacts ->> 'b' else d.reacts ->> 'a' end as their_react
      from public.versus_duels d left join public.profiles o on o.id = case when d.a = me then d.b else d.a end
      where me in (d.a, d.b)
      order by d.created_at desc limit 30) x), '[]'::jsonb));
end $$;

-- ——— v807 : une réaction laissée sur un duel joué (vue par l'adversaire quand il regarde le duel) ————————————
create or replace function public.versus_react(p_id uuid, p_key text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare me uuid := auth.uid(); d public.versus_duels; owned jsonb; side text;
begin
  if me is null then raise exception 'Connecte-toi d’abord.'; end if;
  if p_key is null or not (p_key = any (array['re-salut', 're-bien', 're-merci', 're-aie', 're-mammon', 're-souveraine', 're-archiviste', 're-ilda', 're-orvel', 're-vesna', 're-maitre', 're-echo', 're-g-devoreur', 're-g-matriarche', 're-g-roi', 're-g-architecte', 're-g-eclipse', 're-g-essaim', 're-g-bourreau', 're-g-choeur', 're-g-chaines', 're-g-horloge', 're-g-miroirs', 're-g-golem', 're-g-peste', 're-g-chasseur', 're-g-voeux', 're-g-titan', 're-g-jumeaux', 're-g-juge', 're-g-bete', 're-g-abysse', 're-feu-follet', 're-passeur', 're-blizzard', 're-sentinelle'])) then raise exception 'Réaction inconnue.'; end if;
  select * into d from public.versus_duels where id = p_id and me in (a, b) for update;
  if not found then raise exception 'Défi introuvable.'; end if;
  if d.status <> 'done' then raise exception 'Ce duel n’est pas encore joué.'; end if;
  -- réaction payante : vérifiée dans la partie tenue par le serveur
  if not (p_key = any (array['re-salut', 're-bien', 're-merci', 're-aie'])) and to_regclass('public.parties') is not null then
    execute 'select coalesce(data -> ''emotes'', ''[]''::jsonb) from public.parties where user_id = $1' into owned using me;
    if owned is not null and not (owned ? p_key) then raise exception 'Tu n’as pas encore cette réaction.'; end if;
  end if;
  side := case when d.a = me then 'a' else 'b' end;
  if (d.reacts ->> side) is not null then raise exception 'Tu as déjà réagi à ce duel.'; end if;
  update public.versus_duels set reacts = coalesce(reacts, '{}'::jsonb) || jsonb_build_object(side, p_key) where id = p_id;
  return jsonb_build_object('k', p_key);
end $$;
revoke execute on function public.versus_react(uuid, text) from public, anon;
grant execute on function public.versus_react(uuid, text) to authenticated;

revoke execute on function public.versus_create(text, text, text[], int, uuid) from public, anon;
revoke execute on function public.versus_accept(uuid) from public, anon;
revoke execute on function public.versus_cancel(uuid) from public, anon;
revoke execute on function public.versus_claim(uuid) from public, anon;
revoke execute on function public.versus_list() from public, anon;
grant execute on function public.versus_create(text, text, text[], int, uuid) to authenticated;
grant execute on function public.versus_accept(uuid) to authenticated;
grant execute on function public.versus_cancel(uuid) to authenticated;
grant execute on function public.versus_claim(uuid) to authenticated;
grant execute on function public.versus_list() to authenticated;


-- ABYSSAL:empreinte (écrite par tools/sql-stamp.mjs, ne pas modifier)
create table if not exists public.sql_stamps (file text primary key, stamp text not null, at timestamptz not null default now());
alter table public.sql_stamps enable row level security;
revoke all on public.sql_stamps from public, anon, authenticated;
insert into public.sql_stamps (file, stamp) values ('08', 'df806cac094a') on conflict (file) do update set stamp = excluded.stamp, at = now();
create or replace function public.sql_stamps() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(file, stamp), '{}'::jsonb) from public.sql_stamps;
$$;
revoke execute on function public.sql_stamps() from public, anon;
grant execute on function public.sql_stamps() to authenticated;
-- ABYSSAL:fin

-- Vérification : nombre de cartes tirables et de défis
select (select count(*) from public.shadow_cards) as cartes, (select count(*) from public.versus_duels) as defis;
