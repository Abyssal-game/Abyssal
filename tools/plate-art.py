#!/usr/bin/env python3
"""v564 : intègre une plaque de pseudo reçue de Gemini (bannière horizontale sur fond noir pur).
Usage : python3 tools/plate-art.py <clé pl-…> <image> [--doux=T]
--seuil=N (v568) : noir du fond (22 par défaut ; plus bas si des ornements très sombres touchent le bord).
--fond-clair (v568) : source sur fond blanc ou gris clair (rendu transparent par remplissage depuis les bords).
--doux=T (v568) : bord en fondu au lieu d'une découpe nette, pour les plaques entourées de lueur, de givre ou de brume :
la zone reliée au bord et plus sombre que T devient transparente en proportion de sa luminosité (brume semi-transparente).
La bannière est détectée (pixels nettement plus clairs que le fond noir), recadrée au plus juste, puis ramenée à
640 × 160 (format 4:1 ; le jeu l'étire légèrement autour du pseudo) → assets/plates/<clé>.webp ; la source est
gardée dans store/plates/<clé>-source.jpg. Le noir relié aux bords devient transparent (le centre sombre reste opaque).
"""
import os, sys, shutil
from PIL import Image, ImageDraw
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = [a for a in sys.argv[1:] if not a.startswith('--')]
seuil = next((int(a[8:]) for a in sys.argv[1:] if a.startswith('--seuil=')), 22)
soft = next((int(a[7:]) for a in sys.argv[1:] if a.startswith('--doux=')), 0)
if len(args) != 2 or not args[0].startswith('pl-'):
    sys.exit(__doc__)
key, src = args
im = Image.open(src).convert('RGB')
if '--fond-clair' in sys.argv:  # fond clair relié aux bords → noir pur, la suite fait comme d'habitude
    im = im.copy(); Wi, Hi = im.size
    for p in [(x, 0) for x in range(0, Wi, 16)] + [(x, Hi - 1) for x in range(0, Wi, 16)] + [(0, y) for y in range(0, Hi, 16)] + [(Wi - 1, y) for y in range(0, Hi, 16)]:
        if sum(im.getpixel(p)) > 450: ImageDraw.floodfill(im, p, (1, 254, 1), thresh=40)
    arr = np.asarray(im).copy(); light_bg = np.all(arr == (1, 254, 1), axis=2); arr[light_bg] = 0
    im = Image.fromarray(arr); light_bg = Image.fromarray((light_bg * 255).astype(np.uint8), 'L')
else:
    light_bg = None
a = np.asarray(im).astype(np.int32)
lum = a.max(axis=2)
rows = np.where((lum > 36).mean(axis=1) > 0.04)[0]
cols = np.where((lum > 36).mean(axis=0) > 0.04)[0]
if not len(rows) or not len(cols):
    sys.exit('Bannière introuvable : le fond doit être noir pur.')
box = (int(cols.min()), int(rows.min()), int(cols.max()) + 1, int(rows.max()) + 1)
crop = im.crop(box).resize((640, 160), Image.LANCZOS)
# seul le noir relié au bord de l'image devient transparent (le centre sombre de la plaque, sous le pseudo, reste opaque)
c = np.asarray(crop)
mask = Image.fromarray(np.where(c.max(axis=2) <= seuil, 255, 0).astype(np.uint8), 'L').copy()  # copie : une image faite depuis numpy peut être en lecture seule (Pillow 12)
W, H = mask.size
for x, y in [(x, 0) for x in range(W)] + [(x, H - 1) for x in range(W)] + [(0, y) for y in range(H)] + [(W - 1, y) for y in range(H)]:
    if mask.getpixel((x, y)) == 255: ImageDraw.floodfill(mask, (x, y), 128)
alpha = np.where(np.asarray(mask) == 128, 0, 255).astype(np.uint8)
if light_bg is not None:  # fond clair : la transparence vient du remplissage fait sur la source (les ornements noirs restent)
    alpha = 255 - np.asarray(light_bg.crop(box).resize((640, 160), Image.BILINEAR))
if soft:  # zone sombre reliée au bord : transparence selon la luminosité, couleur dé-mélangée du noir
    lum = c.max(axis=2).astype(np.float32)
    m2 = Image.fromarray(np.where(lum < soft, 255, 0).astype(np.uint8), 'L').copy()  # copie : une image faite depuis numpy peut être en lecture seule (Pillow 12)
    for x, y in [(x, 0) for x in range(W)] + [(x, H - 1) for x in range(W)] + [(0, y) for y in range(H)] + [(W - 1, y) for y in range(H)]:
        if m2.getpixel((x, y)) == 255: ImageDraw.floodfill(m2, (x, y), 128)
    out_zone = np.asarray(m2) == 128
    out_zone[int(H * .2):int(H * .8), int(W * .1):int(W * .9)] = False  # le centre de la plaque reste opaque
    a = np.clip(lum / soft, 0, 1)
    alpha = np.where(out_zone, (a * 255).astype(np.uint8), 255).astype(np.uint8)
    cf = c.astype(np.float32); div = np.maximum(a, 1e-3)[..., None]
    c = np.where(out_zone[..., None], np.clip(cf / div, 0, 255), cf).astype(np.uint8)
out = Image.fromarray(np.dstack([c, alpha]), 'RGBA')
os.makedirs(os.path.join(ROOT, 'assets/plates'), exist_ok=True)
os.makedirs(os.path.join(ROOT, 'store/plates'), exist_ok=True)
dst = os.path.join(ROOT, 'assets/plates', f'{key}.webp')
out.save(dst, 'WEBP', quality=82, alpha_quality=70, method=6)
store = os.path.join(ROOT, 'store/plates', f'{key}-source.jpg')
if os.path.abspath(src) != os.path.abspath(store):
    shutil.copy(src, store)
print(dst, os.path.getsize(dst) // 1024, 'Ko')
