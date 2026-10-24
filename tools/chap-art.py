#!/usr/bin/env python3
# v700 : bandeau peint d'un chapitre de la Descente (image Gemini 16:9).
# Usage : python3 tools/chap-art.py <numéro 1-20> <image> [décalage vertical -1..1]
# Recadre en 21:9 (centre, ou plus haut / plus bas avec le décalage), 1050 × 450, WebP → assets/chapitres/chap-N.webp ;
# la source est gardée dans store/chapitres/chap-N-source.jpg. Ajouter ensuite N à CHAP_ART (js/screens/descent.js).
import sys, shutil
from PIL import Image
n = int(sys.argv[1]); src = sys.argv[2]; shift = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
im = Image.open(src).convert('RGB')
shutil.copy(src, f'store/chapitres/chap-{n}-source.jpg') if not src.endswith(f'chap-{n}-source.jpg') else None
W, H = im.size
h = round(W * 9 / 21)
if h > H: w = round(H * 21 / 9); x = (W - w) // 2; box = (x, 0, x + w, H)
else: y = round((H - h) / 2 * (1 + shift)); y = max(0, min(H - h, y)); box = (0, y, W, y + h)
out = im.crop(box).resize((1050, 450), Image.LANCZOS)
out.save(f'assets/chapitres/chap-{n}.webp', 'WEBP', quality=78, method=6)
print(f'assets/chapitres/chap-{n}.webp', out.size)
