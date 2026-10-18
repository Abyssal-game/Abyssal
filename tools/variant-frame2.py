#!/usr/bin/env python3
"""v446 : cadre de finition peint (fond noir) -> cadre transparent 600 x 844 calé sur le BORD de la carte.
Usage : python3 tools/variant-frame2.py source.jpg sortie.webp [gain] [marge]
Différence avec variant-frame.py : le cadre est recadré sur ses barres droites extérieures (pas sur ses ornements),
posées à `marge` px du bord (ornements qui dépassent coupés), et la hauteur en trop est retirée au milieu
à l'endroit où les deux bords se raccordent le mieux (pas de cassure visible)."""
import sys
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
gain = float(sys.argv[3]) if len(sys.argv) > 3 else 1.8
M = int(sys.argv[4]) if len(sys.argv) > 4 else 12
W, H = 600, 844
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
b = im.max(axis=2) > 60
col, row = b.mean(axis=0), b.mean(axis=1)
xs, ys = np.where(col > 0.5)[0], np.where(row > 0.5)[0]
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
k = (W - 2 * M) / (x1 - x0 + 1)
# image entière mise à l'échelle, barres extérieures à M px du bord
big = np.asarray(Image.fromarray(im.astype(np.uint8)).resize((round(im.shape[1] * k), round(im.shape[0] * k)), Image.LANCZOS)).astype(np.float32)
ox, oy = round(x0 * k) - M, round(y0 * k) - M
hb = round((y1 - y0 + 1) * k) + 2 * M          # hauteur du cadre (barres + marges)
pad = max(0, -oy)
if pad: big = np.concatenate([np.zeros((pad, big.shape[1], 3), np.float32), big]); oy += pad
fr = big[oy:oy + hb, ox:ox + W]
if fr.shape[1] < W: fr = np.concatenate([fr, np.zeros((fr.shape[0], W - fr.shape[1], 3), np.float32)], axis=1)
cut = fr.shape[0] - H
if cut > 0:
    sides = np.r_[0:int(W * .2), int(W * .8):W]
    mid = fr.shape[0] // 2
    best, bs = None, 1e18
    for s in range(mid - cut - 60, mid + 60):
        if s < 200 or s + cut > fr.shape[0] - 200: continue
        d = np.abs(fr[s - 2:s + 2, sides] - fr[s + cut - 2:s + cut + 2, sides]).mean()
        if d < bs: bs, best = d, s
    fr = np.concatenate([fr[:best], fr[best + cut:]], axis=0)
    # fondu de 6 lignes sur la couture
    for i in range(-3, 3):
        y = best + i
        if 0 < y < H - 1: fr[y] = (fr[y - 1] + fr[y + 1]) / 2 if i in (-1, 0) else fr[y]
    print('coupe', cut, 'à', best, 'écart', round(bs, 2))
elif cut < 0:
    raise SystemExit('source trop basse pour ce format')
a = np.clip(fr.max(axis=2) / 255 * gain, 0, 1)
rgb = np.clip(fr / np.maximum(a[..., None], 1e-3), 0, 255)
rgba = np.dstack([rgb, a * 255]).astype(np.uint8)
Image.fromarray(rgba, 'RGBA').save(out, 'WEBP', quality=85, alpha_quality=85, method=6)
print(out, Image.open(out).size)
