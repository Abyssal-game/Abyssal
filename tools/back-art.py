# Usage : python3 tools/back-art.py <clé> <source.jpg> [--opaque]   (--opaque : fond clair à garder, ex. marbre céleste) (v473 : dos de cartes Gemini du Codex et de l'Échoppe)
# Fond blanc relié au bord (coins arrondis, découpes entre les ornements) rendu transparent, recadrage 5:7 centré,
# 600 × 840 → assets/backs/<clé>.webp. Source gardée dans store/backs/<clé>-source.jpg.
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
key, src = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
a = np.asarray(im, float); H, W, _ = a.shape
white = (a.min(-1) > 225).astype(np.uint8) * 255
m = Image.fromarray(white).copy()
for x in range(0, W, 6):
    for y in (0, H - 1):
        if m.getpixel((x, y)) == 255: ImageDraw.floodfill(m, (x, y), 128, thresh=0)
for y in range(0, H, 6):
    for x in (0, W - 1):
        if m.getpixel((x, y)) == 255: ImageDraw.floodfill(m, (x, y), 128, thresh=0)
bg = (np.asarray(m) == 128) & ('--opaque' not in sys.argv)
alpha = np.where(bg, 0, 255).astype(np.uint8)
alpha = np.asarray(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.8)))
rgba = Image.fromarray(np.dstack([a.astype(np.uint8), alpha]), 'RGBA')
# recadrage 5:7 centré
tw = min(W, round(H * 5 / 7)); th = round(tw * 7 / 5)
if th > H: th = H; tw = round(th * 5 / 7)
x0, y0 = (W - tw) // 2, (H - th) // 2
rgba.crop((x0, y0, x0 + tw, y0 + th)).resize((600, 840), Image.LANCZOS).save(f'assets/backs/{key}.webp', quality=84, method=6)
print(key, (W, H), '→', (tw, th), f'transparent {bg.mean() * 100:.1f} %')
