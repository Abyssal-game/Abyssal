#!/usr/bin/env python3
"""v565 : habillage de booster (« sachet ») reçu de Gemini → assets/packs/<clé>.webp (464 × 800, fond transparent).
Usage : python3 tools/sachet-art.py <clé sachet-…> <image>
Le fond (noir, gris ou blanc) relié aux bords de l'image est rendu transparent par remplissage (il s'arrête sur les
bords du sachet), puis le sachet est recadré au plus juste et centré dans un cadre 29:50, comme les autres boosters.
La source est gardée dans store/packs/<clé>-source.jpg.
"""
import os, sys, shutil
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if len(sys.argv) != 3 or not sys.argv[1].startswith('sachet-'):
    sys.exit(__doc__)
key, src = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
W, H = im.size
# remplissage depuis le bord sur une copie adoucie (le fond des images Gemini est souvent un dégradé)
soft = im.filter(ImageFilter.GaussianBlur(1.2))
MARK = (255, 0, 255)
for x, y in [(x, 0) for x in range(0, W, 8)] + [(x, H - 1) for x in range(0, W, 8)] + [(0, y) for y in range(0, H, 8)] + [(W - 1, y) for y in range(0, H, 8)]:
    if soft.getpixel((x, y)) != MARK: ImageDraw.floodfill(soft, (x, y), MARK, thresh=26)
bg = np.all(np.asarray(soft) == MARK, axis=2)
o = np.asarray(im).astype(int); bg |= (o[..., 0] > 170) & (o[..., 1] < 90) & (o[..., 2] > 170)  # fond magenta posé à la main (recadrage manuel)
alpha = Image.fromarray(np.where(bg, 0, 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
rgb = np.asarray(im).copy(); rgb[bg] = 0  # couleur du fond mise au noir : pas de liseré coloré au redimensionnement
rgba = Image.fromarray(rgb); rgba.putalpha(alpha)
ys, xs = np.where(np.asarray(alpha) > 128)
box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
pack = rgba.crop(box)
w, h = pack.size
cw = max(w, round(h * 464 / 800)); ch = round(cw * 800 / 464)
canvas = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
canvas.paste(pack, ((cw - w) // 2, (ch - h) // 2), pack)
out = canvas.resize((464, 800), Image.LANCZOS)
dst = os.path.join(ROOT, 'assets/packs', f'{key}.webp')
out.save(dst, 'WEBP', quality=84, alpha_quality=80, method=6)
store = os.path.join(ROOT, 'store/packs', f'{key}-source.jpg')
os.makedirs(os.path.dirname(store), exist_ok=True)
if os.path.abspath(src) != os.path.abspath(store) and not os.path.exists(store):
    shutil.copy(src, store)
print(dst, f'sachet {w}×{h} → 464×800', round((np.asarray(out)[..., 3] < 20).mean() * 100, 1), '% transparent')
