#!/usr/bin/env python3
"""v564 : intègre une plaque de pseudo reçue de Gemini (bannière horizontale sur fond noir pur).
Usage : python3 tools/plate-art.py <clé pl-…> <image>
La bannière est détectée (pixels nettement plus clairs que le fond noir), recadrée au plus juste, puis ramenée à
640 × 160 (format 4:1 ; le jeu l'étire légèrement autour du pseudo) → assets/plates/<clé>.webp ; la source est
gardée dans store/plates/<clé>-source.jpg. Le noir relié aux bords devient transparent (le centre sombre reste opaque).
"""
import os, sys, shutil
from PIL import Image, ImageDraw
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if len(sys.argv) != 3 or not sys.argv[1].startswith('pl-'):
    sys.exit(__doc__)
key, src = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(np.int32)
lum = a.max(axis=2)
rows = np.where((lum > 36).mean(axis=1) > 0.04)[0]
cols = np.where((lum > 36).mean(axis=0) > 0.04)[0]
if not len(rows) or not len(cols):
    sys.exit('Bannière introuvable : le fond doit être noir pur.')
crop = im.crop((int(cols.min()), int(rows.min()), int(cols.max()) + 1, int(rows.max()) + 1)).resize((640, 160), Image.LANCZOS)
# seul le noir relié au bord de l'image devient transparent (le centre sombre de la plaque, sous le pseudo, reste opaque)
c = np.asarray(crop)
mask = Image.fromarray(np.where(c.max(axis=2) <= 22, 255, 0).astype(np.uint8), 'L')
W, H = mask.size
for x, y in [(x, 0) for x in range(W)] + [(x, H - 1) for x in range(W)] + [(0, y) for y in range(H)] + [(W - 1, y) for y in range(H)]:
    if mask.getpixel((x, y)) == 255: ImageDraw.floodfill(mask, (x, y), 128)
alpha = np.where(np.asarray(mask) == 128, 0, 255).astype(np.uint8)
out = Image.fromarray(np.dstack([c, alpha]), 'RGBA')
os.makedirs(os.path.join(ROOT, 'assets/plates'), exist_ok=True)
os.makedirs(os.path.join(ROOT, 'store/plates'), exist_ok=True)
dst = os.path.join(ROOT, 'assets/plates', f'{key}.webp')
out.save(dst, 'WEBP', quality=82, alpha_quality=70, method=6)
store = os.path.join(ROOT, 'store/plates', f'{key}-source.jpg')
if os.path.abspath(src) != os.path.abspath(store):
    shutil.copy(src, store)
print(dst, os.path.getsize(dst) // 1024, 'Ko')
