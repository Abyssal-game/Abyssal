#!/usr/bin/env python3
# v713 : tableau d'apparition d'un gardien (image Gemini verticale 9:16, peinture pleine page avec son décor).
# Usage : python3 tools/boss-art.py <clé> <image> [décalage vertical -1..1]
# Recadre en 9:16 (centre, ou plus haut / plus bas), 720 × 1280, WebP → assets/bosses/scene-<clé>.webp ;
# la source est gardée dans store/bosses/scene-<clé>-source.jpg. Ajouter ensuite la clé à BOSS_ART (js/screens/descent.js).
import sys, shutil, os
from PIL import Image
k = sys.argv[1]; src = sys.argv[2]; shift = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
dst_src = f'store/bosses/scene-{k}-source.jpg'
if os.path.abspath(src) != os.path.abspath(dst_src): Image.open(src).convert('RGB').save(dst_src, 'JPEG', quality=92)
im = Image.open(src).convert('RGB')
W, H = im.size
h = round(W * 16 / 9)
if h > H: w = round(H * 9 / 16); x = (W - w) // 2; box = (x, 0, x + w, H)
else: y = round((H - h) / 2 * (1 + shift)); y = max(0, min(H - h, y)); box = (0, y, W, y + h)
out = im.crop(box).resize((720, 1280), Image.LANCZOS)
out.save(f'assets/bosses/scene-{k}.webp', 'WEBP', quality=80, method=6)
print(f'assets/bosses/scene-{k}.webp', out.size, os.path.getsize(f'assets/bosses/scene-{k}.webp') // 1024, 'Ko')
