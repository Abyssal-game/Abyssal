#!/usr/bin/env python3
"""v416 : cadre de finition peint par Gemini (sur fond noir) -> cadre transparent 600 x 844 posé sur les cartes.
Usage : python3 tools/variant-frame.py source.jpg assets/variants/<nom>.webp [gain]
Le cadre est recadré sur ses ornements, mis à 600 px de large, puis la bande du milieu (côtés répétitifs) est retirée
ou doublée pour atteindre 844 px de haut sans déformer les coins. Le noir devient transparent (alpha = luminosité × gain,
couleur dé-mélangée du noir)."""
import sys
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
gain = float(sys.argv[3]) if len(sys.argv) > 3 else 1.8
W, H = 600, 844
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
lum = im.max(axis=2)
ys, xs = np.where(lum > 38)
im = im[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
h, w = im.shape[:2]
nh = round(h * W / w)
im = np.asarray(Image.fromarray(im.astype(np.uint8)).resize((W, nh), Image.LANCZOS)).astype(np.float32)
mid = nh // 2
if nh > H:
    cut = nh - H
    im = np.concatenate([im[:mid - cut // 2], im[mid - cut // 2 + cut:]], axis=0)
elif nh < H:
    add = H - nh
    band = im[mid - add // 2: mid - add // 2 + add]
    im = np.concatenate([im[:mid], band, im[mid:]], axis=0)
im = im[:H]
a = np.clip(im.max(axis=2) / 255 * gain, 0, 1)
rgb = np.clip(im / np.maximum(a[..., None], 1e-3), 0, 255)
rgba = np.dstack([rgb, a * 255]).astype(np.uint8)
Image.fromarray(rgba, 'RGBA').save(out, 'WEBP', quality=85, alpha_quality=85, method=6)
print(out, Image.open(out).size)
