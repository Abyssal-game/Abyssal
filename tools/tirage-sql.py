#!/usr/bin/env python3
"""Génère supabase/05-tirage.sql (Tirage des Ombres) à partir des cartes du jeu.
À relancer si des cartes sont ajoutées, puis réexécuter le fichier dans Supabase."""
import json, glob, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cards = []
for p in sorted(glob.glob(os.path.join(root, 'data/cards/*.json'))):
    for c in json.load(open(p)):
        cards.append((c['id'], c['rarity'], c['faction'], [v for v in c['variants'] if v in ('holo', 'gold', 'galaxy')]))
rows = ',\n'.join("('%s','%s','%s','{%s}')" % (i, r, f, ','.join(v)) for i, r, f, v in cards)
sql = open(os.path.join(root, 'tools/tirage-template.sql')).read().replace('--CARTES--', rows)
open(os.path.join(root, 'supabase/05-tirage.sql'), 'w').write(sql)
print(len(cards), 'cartes')
