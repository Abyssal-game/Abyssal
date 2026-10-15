#!/usr/bin/env python3
"""Intègre un visuel de booster reçu de Gemini (sachet sur fond noir, format 9:16) dans assets/packs/<clé>.webp (464 × 800).
Usage : python3 tools/pack-art.py <clé> <image>   (clés : standard, event, infernal, abyssal, celeste, sauvage, necrotique, primordial, artificiel, premium, shadow)
Le sachet est détecté (pixels nettement plus clairs que le fond noir), recadré sur toute sa hauteur avec des marges noires
latérales d'environ 15 px (invisibles sur le fond du jeu), puis ramené à 464 × 800 ; la source est gardée dans store/logo/.
"""
import os, sys, shutil
from PIL import Image
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEYS = ['standard', 'event', 'infernal', 'abyssal', 'celeste', 'sauvage', 'necrotique', 'primordial', 'artificiel', 'premium', 'shadow']
if len(sys.argv) != 3 or sys.argv[1] not in KEYS:
    sys.exit(__doc__)
key, src = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
a = np.asarray(im).max(axis=2)
rows = np.where((a > 40).mean(axis=1) > 0.02)[0]; cols = np.where((a > 40).mean(axis=0) > 0.02)[0]
top, bot, left, right = rows.min(), rows.max(), cols.min(), cols.max()
h = bot - top + 1
w = int(round(h * 464 / 800))  # cadre 29:50, centré sur le sachet
cx = (left + right) / 2
box = (int(round(cx - w / 2)), int(top), int(round(cx + w / 2)), int(bot + 1))
canvas = Image.new('RGB', (box[2] - box[0], box[3] - box[1]), (0, 0, 0))
crop = im.crop((max(0, box[0]), box[1], min(im.width, box[2]), box[3]))
canvas.paste(crop, (max(0, -box[0]), 0))
out = canvas.resize((464, 800), Image.LANCZOS)
os.makedirs(os.path.join(ROOT, 'assets/packs'), exist_ok=True)
out.save(os.path.join(ROOT, f'assets/packs/{key}.webp'), quality=90, method=6)
name = {'event': 'evenement', 'shadow': 'ombres'}.get(key, key)
dst = os.path.join(ROOT, 'store/logo', f'booster-{name}-source.jpg')
if os.path.abspath(src) != os.path.abspath(dst):
    Image.open(src).convert('RGB').save(dst, quality=92)
print(f'sachet détecté : {right - left + 1} × {h} px, marges latérales {(w - (right - left + 1)) / 2:.0f} px → assets/packs/{key}.webp (464 × 800), source gardée dans store/logo/')
