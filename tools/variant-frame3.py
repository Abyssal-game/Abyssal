#!/usr/bin/env python3
"""v482 : cadre de finition peint (fond noir) -> cadre transparent 600 x 844, découpé en neuf morceaux.
Usage : python3 tools/variant-frame3.py source.jpg sortie.webp [gain] [coin] [marge]
Pour les sources dont le rectangle n'a pas les proportions d'une carte (Gemini rend parfois un cadre trop haut et
trop étroit) : le cadre est repéré (pixels plus clairs que 40), mis à l'échelle sur la largeur, puis les quatre coins
(carrés de `coin` × largeur du cadre, 0,16 par défaut) sont gardés tels quels et seuls les bords droits sont
étirés ou tassés en longueur. Le noir devient transparent (alpha = luminosité × gain)."""
import sys
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
gain = float(sys.argv[3]) if len(sys.argv) > 3 else 2.2
cf = float(sys.argv[4]) if len(sys.argv) > 4 else 0.16
M = int(sys.argv[5]) if len(sys.argv) > 5 else 12
W, H = 600, 844
im = Image.open(src).convert('RGB')
a = np.asarray(im).max(axis=2) > 40
ys, xs = np.where(a)
box = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
iw, ih = W - 2 * M, H - 2 * M
s = iw / box.width
box = box.resize((iw, max(1, round(box.height * s))), Image.LANCZOS)
bw, bh = box.size
c = round(cf * bw)
if bh < 2 * c + 4: raise SystemExit('cadre trop bas')
out_im = Image.new('RGB', (W, H), (0, 0, 0))
# coins
for (sx, sy, dx, dy) in [(0, 0, 0, 0), (bw - c, 0, iw - c, 0), (0, bh - c, 0, ih - c), (bw - c, bh - c, iw - c, ih - c)]:
    out_im.paste(box.crop((sx, sy, sx + c, sy + c)), (M + dx, M + dy))
# bords haut et bas (même largeur après mise à l'échelle)
out_im.paste(box.crop((c, 0, bw - c, c)), (M + c, M))
out_im.paste(box.crop((c, bh - c, bw - c, bh)), (M + c, M + ih - c))
# bords gauche et droit, étirés ou tassés à la bonne hauteur
for sx, dx in [(0, 0), (bw - c, iw - c)]:
    strip = box.crop((sx, c, sx + c, bh - c)).resize((c, ih - 2 * c), Image.LANCZOS)
    out_im.paste(strip, (M + dx, M + c))
fr = np.asarray(out_im).astype(np.float32)
al = np.clip(fr.max(axis=2) / 255 * gain, 0, 1)
rgb = np.clip(fr / np.maximum(al[..., None], 1e-3), 0, 255)
Image.fromarray(np.dstack([rgb, al * 255]).astype(np.uint8), 'RGBA').save(out, 'WEBP', quality=85, alpha_quality=85, method=6)
print(out, f'cadre {xs.max() - xs.min() + 1}×{ys.max() - ys.min() + 1}, échelle {s:.2f}, coin {c}px, bords {"étirés" if ih - 2 * c > bh - 2 * c else "tassés"}')
