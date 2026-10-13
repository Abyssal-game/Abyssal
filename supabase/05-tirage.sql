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
('ABY-001','C','abyssal','{holo,galaxy}'),
('ABY-002','C','abyssal','{holo,galaxy}'),
('ABY-003','C','abyssal','{holo,galaxy}'),
('ABY-004','C','abyssal','{holo,galaxy}'),
('ABY-005','C','abyssal','{holo,galaxy}'),
('ABY-006','C','abyssal','{holo,galaxy}'),
('ABY-007','PC','abyssal','{holo,galaxy}'),
('ABY-008','C','abyssal','{holo,galaxy}'),
('ABY-009','C','abyssal','{holo,galaxy}'),
('ABY-010','C','abyssal','{holo,galaxy}'),
('ABY-011','C','abyssal','{holo,galaxy}'),
('ABY-012','C','abyssal','{holo,galaxy}'),
('ABY-013','C','abyssal','{holo,galaxy}'),
('ABY-014','C','abyssal','{holo,galaxy}'),
('ABY-015','C','abyssal','{holo,galaxy}'),
('ABY-016','C','abyssal','{holo,galaxy}'),
('ABY-017','PC','abyssal','{holo,galaxy}'),
('ABY-018','PC','abyssal','{holo,galaxy}'),
('ABY-019','PC','abyssal','{holo,galaxy}'),
('ABY-020','PC','abyssal','{holo,galaxy}'),
('ABY-021','PC','abyssal','{holo,galaxy}'),
('ABY-022','PC','abyssal','{holo,galaxy}'),
('ABY-023','PC','abyssal','{holo,galaxy}'),
('ABY-024','PC','abyssal','{holo,galaxy}'),
('ABY-025','PC','abyssal','{holo,galaxy}'),
('ABY-026','PC','abyssal','{holo,galaxy}'),
('ABY-027','PC','abyssal','{holo,galaxy}'),
('ABY-028','C','abyssal','{holo,galaxy}'),
('ABY-029','PC','abyssal','{holo,galaxy}'),
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
('ART-001','C','artificiel','{holo,galaxy}'),
('ART-002','C','artificiel','{holo,galaxy}'),
('ART-003','C','artificiel','{holo,galaxy}'),
('ART-004','C','artificiel','{holo,galaxy}'),
('ART-005','C','artificiel','{holo,galaxy}'),
('ART-006','C','artificiel','{holo,galaxy}'),
('ART-007','C','artificiel','{holo,galaxy}'),
('ART-008','C','artificiel','{holo,galaxy}'),
('ART-009','C','artificiel','{holo,galaxy}'),
('ART-010','C','artificiel','{holo,galaxy}'),
('ART-011','C','artificiel','{holo,galaxy}'),
('ART-012','C','artificiel','{holo,galaxy}'),
('ART-013','C','artificiel','{holo,galaxy}'),
('ART-014','C','artificiel','{holo,galaxy}'),
('ART-015','C','artificiel','{holo,galaxy}'),
('ART-016','C','artificiel','{holo,galaxy}'),
('ART-017','PC','artificiel','{holo,galaxy}'),
('ART-018','PC','artificiel','{holo,galaxy}'),
('ART-019','PC','artificiel','{holo,galaxy}'),
('ART-020','PC','artificiel','{holo,galaxy}'),
('ART-021','PC','artificiel','{holo,galaxy}'),
('ART-022','PC','artificiel','{holo,galaxy}'),
('ART-023','PC','artificiel','{holo,galaxy}'),
('ART-024','PC','artificiel','{holo,galaxy}'),
('ART-025','PC','artificiel','{holo,galaxy}'),
('ART-026','PC','artificiel','{holo,galaxy}'),
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
('CEL-001','C','celeste','{holo,galaxy}'),
('CEL-002','C','celeste','{holo,galaxy}'),
('CEL-003','C','celeste','{holo,galaxy}'),
('CEL-004','C','celeste','{holo,galaxy}'),
('CEL-005','C','celeste','{holo,galaxy}'),
('CEL-006','C','celeste','{holo,galaxy}'),
('CEL-007','PC','celeste','{holo,galaxy}'),
('CEL-008','C','celeste','{holo,galaxy}'),
('CEL-009','C','celeste','{holo,galaxy}'),
('CEL-010','C','celeste','{holo,galaxy}'),
('CEL-011','C','celeste','{holo,galaxy}'),
('CEL-012','C','celeste','{holo,galaxy}'),
('CEL-013','C','celeste','{holo,galaxy}'),
('CEL-014','C','celeste','{holo,galaxy}'),
('CEL-015','C','celeste','{holo,galaxy}'),
('CEL-016','C','celeste','{holo,galaxy}'),
('CEL-017','PC','celeste','{holo,galaxy}'),
('CEL-018','PC','celeste','{holo,galaxy}'),
('CEL-019','PC','celeste','{holo,galaxy}'),
('CEL-020','PC','celeste','{holo,galaxy}'),
('CEL-021','PC','celeste','{holo,galaxy}'),
('CEL-022','PC','celeste','{holo,galaxy}'),
('CEL-023','PC','celeste','{holo,galaxy}'),
('CEL-024','PC','celeste','{holo,galaxy}'),
('CEL-025','PC','celeste','{holo,galaxy}'),
('CEL-026','C','celeste','{holo,galaxy}'),
('CEL-027','PC','celeste','{holo,galaxy}'),
('CEL-028','PC','celeste','{holo,galaxy}'),
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
('CEL-050','PC','celeste','{holo,galaxy}'),
('CEL-051','R','celeste','{holo,galaxy,gold}'),
('CEL-052','R','celeste','{holo,galaxy,gold}'),
('CEL-053','M','celeste','{holo,galaxy,gold}'),
('INF-001','C','infernal','{holo,galaxy}'),
('INF-002','C','infernal','{holo,galaxy}'),
('INF-003','C','infernal','{holo,galaxy}'),
('INF-004','C','infernal','{holo,galaxy}'),
('INF-005','C','infernal','{holo,galaxy}'),
('INF-006','C','infernal','{holo,galaxy}'),
('INF-007','C','infernal','{holo,galaxy}'),
('INF-008','C','infernal','{holo,galaxy}'),
('INF-009','C','infernal','{holo,galaxy}'),
('INF-010','C','infernal','{holo,galaxy}'),
('INF-011','C','infernal','{holo,galaxy}'),
('INF-012','PC','infernal','{holo,galaxy}'),
('INF-013','C','infernal','{holo,galaxy}'),
('INF-014','C','infernal','{holo,galaxy}'),
('INF-015','C','infernal','{holo,galaxy}'),
('INF-016','C','infernal','{holo,galaxy}'),
('INF-017','C','infernal','{holo,galaxy}'),
('INF-018','PC','infernal','{holo,galaxy}'),
('INF-019','PC','infernal','{holo,galaxy}'),
('INF-020','PC','infernal','{holo,galaxy}'),
('INF-021','PC','infernal','{holo,galaxy}'),
('INF-022','PC','infernal','{holo,galaxy}'),
('INF-023','PC','infernal','{holo,galaxy}'),
('INF-024','PC','infernal','{holo,galaxy}'),
('INF-025','PC','infernal','{holo,galaxy}'),
('INF-026','PC','infernal','{holo,galaxy}'),
('INF-027','PC','infernal','{holo,galaxy}'),
('INF-028','PC','infernal','{holo,galaxy}'),
('INF-029','PC','infernal','{holo,galaxy}'),
('INF-030','PC','infernal','{holo,galaxy}'),
('INF-031','PC','infernal','{holo,galaxy}'),
('INF-032','C','infernal','{holo,galaxy}'),
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
('INF-059','PC','infernal','{holo,galaxy}'),
('INF-060','PC','infernal','{holo,galaxy}'),
('INF-061','R','infernal','{holo,galaxy,gold}'),
('INF-062','R','infernal','{holo,galaxy,gold}'),
('INF-063','PC','infernal','{holo,galaxy}'),
('INF-064','R','infernal','{holo,galaxy,gold}'),
('NEC-001','C','necrotique','{holo,galaxy}'),
('NEC-002','C','necrotique','{holo,galaxy}'),
('NEC-003','C','necrotique','{holo,galaxy}'),
('NEC-004','C','necrotique','{holo,galaxy}'),
('NEC-005','C','necrotique','{holo,galaxy}'),
('NEC-006','PC','necrotique','{holo,galaxy}'),
('NEC-007','C','necrotique','{holo,galaxy}'),
('NEC-008','C','necrotique','{holo,galaxy}'),
('NEC-009','C','necrotique','{holo,galaxy}'),
('NEC-010','C','necrotique','{holo,galaxy}'),
('NEC-011','C','necrotique','{holo,galaxy}'),
('NEC-012','C','necrotique','{holo,galaxy}'),
('NEC-013','C','necrotique','{holo,galaxy}'),
('NEC-014','C','necrotique','{holo,galaxy}'),
('NEC-015','C','necrotique','{holo,galaxy}'),
('NEC-016','C','necrotique','{holo,galaxy}'),
('NEC-017','PC','necrotique','{holo,galaxy}'),
('NEC-018','PC','necrotique','{holo,galaxy}'),
('NEC-019','PC','necrotique','{holo,galaxy}'),
('NEC-020','PC','necrotique','{holo,galaxy}'),
('NEC-021','PC','necrotique','{holo,galaxy}'),
('NEC-022','PC','necrotique','{holo,galaxy}'),
('NEC-023','PC','necrotique','{holo,galaxy}'),
('NEC-024','C','necrotique','{holo,galaxy}'),
('NEC-025','PC','necrotique','{holo,galaxy}'),
('NEC-026','PC','necrotique','{holo,galaxy}'),
('NEC-027','PC','necrotique','{holo,galaxy}'),
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
('NEC-045','C','necrotique','{holo,galaxy}'),
('NEC-046','C','necrotique','{holo,galaxy}'),
('NEC-047','PC','necrotique','{holo,galaxy}'),
('NEC-048','HR','necrotique','{holo,galaxy,gold}'),
('NEC-049','PC','necrotique','{holo,galaxy}'),
('NEC-050','R','necrotique','{holo,galaxy,gold}'),
('NEC-051','PC','necrotique','{holo,galaxy}'),
('NEC-052','C','necrotique','{holo,galaxy}'),
('NEC-053','C','necrotique','{holo,galaxy}'),
('NEC-054','R','necrotique','{holo,galaxy,gold}'),
('NEC-055','C','necrotique','{holo,galaxy}'),
('NEC-056','R','necrotique','{holo,galaxy,gold}'),
('NEC-057','M','necrotique','{holo,galaxy,gold}'),
('PRI-001','C','primordial','{holo,galaxy}'),
('PRI-002','C','primordial','{holo,galaxy}'),
('PRI-003','C','primordial','{holo,galaxy}'),
('PRI-004','PC','primordial','{holo,galaxy}'),
('PRI-005','C','primordial','{holo,galaxy}'),
('PRI-006','C','primordial','{holo,galaxy}'),
('PRI-007','C','primordial','{holo,galaxy}'),
('PRI-008','C','primordial','{holo,galaxy}'),
('PRI-009','C','primordial','{holo,galaxy}'),
('PRI-010','PC','primordial','{holo,galaxy}'),
('PRI-011','C','primordial','{holo,galaxy}'),
('PRI-012','C','primordial','{holo,galaxy}'),
('PRI-013','C','primordial','{holo,galaxy}'),
('PRI-014','PC','primordial','{holo,galaxy}'),
('PRI-015','PC','primordial','{holo,galaxy}'),
('PRI-016','PC','primordial','{holo,galaxy}'),
('PRI-017','PC','primordial','{holo,galaxy}'),
('PRI-018','PC','primordial','{holo,galaxy}'),
('PRI-019','PC','primordial','{holo,galaxy}'),
('PRI-020','PC','primordial','{holo,galaxy}'),
('PRI-021','PC','primordial','{holo,galaxy}'),
('PRI-022','PC','primordial','{holo,galaxy}'),
('PRI-023','PC','primordial','{holo,galaxy}'),
('PRI-024','C','primordial','{holo,galaxy}'),
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
('SAU-001','C','sauvage','{holo,galaxy}'),
('SAU-002','C','sauvage','{holo,galaxy}'),
('SAU-003','C','sauvage','{holo,galaxy}'),
('SAU-004','C','sauvage','{holo,galaxy}'),
('SAU-005','C','sauvage','{holo,galaxy}'),
('SAU-006','C','sauvage','{holo,galaxy}'),
('SAU-007','C','sauvage','{holo,galaxy}'),
('SAU-008','C','sauvage','{holo,galaxy}'),
('SAU-009','PC','sauvage','{holo,galaxy}'),
('SAU-010','C','sauvage','{holo,galaxy}'),
('SAU-011','C','sauvage','{holo,galaxy}'),
('SAU-012','C','sauvage','{holo,galaxy}'),
('SAU-013','C','sauvage','{holo,galaxy}'),
('SAU-014','C','sauvage','{holo,galaxy}'),
('SAU-015','C','sauvage','{holo,galaxy}'),
('SAU-016','PC','sauvage','{holo,galaxy}'),
('SAU-017','C','sauvage','{holo,galaxy}'),
('SAU-018','PC','sauvage','{holo,galaxy}'),
('SAU-019','PC','sauvage','{holo,galaxy}'),
('SAU-020','PC','sauvage','{holo,galaxy}'),
('SAU-021','C','sauvage','{holo,galaxy}'),
('SAU-022','PC','sauvage','{holo,galaxy}'),
('SAU-023','PC','sauvage','{holo,galaxy}'),
('SAU-024','PC','sauvage','{holo,galaxy}'),
('SAU-025','PC','sauvage','{holo,galaxy}'),
('SAU-026','PC','sauvage','{holo,galaxy}'),
('SAU-027','PC','sauvage','{holo,galaxy}'),
('SAU-028','PC','sauvage','{holo,galaxy}'),
('SAU-029','C','sauvage','{holo,galaxy}'),
('SAU-030','PC','sauvage','{holo,galaxy}'),
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
('SAU-052','PC','sauvage','{holo,galaxy}'),
('SAU-053','C','sauvage','{holo,galaxy}'),
('SAU-054','R','sauvage','{holo,galaxy,gold}'),
('SAU-055','R','sauvage','{holo,galaxy,gold}'),
('SAU-056','PC','sauvage','{holo,galaxy}'),
('SAU-057','PC','sauvage','{holo,galaxy}'),
('SAU-058','C','sauvage','{holo,galaxy}'),
('SAU-059','PC','sauvage','{holo,galaxy}'),
('SAU-060','HR','sauvage','{holo,galaxy,gold}'),
('SAU-061','R','sauvage','{holo,galaxy,gold}'),
('SAU-062','PC','sauvage','{holo,galaxy}');

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
