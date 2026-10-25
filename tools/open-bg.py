#!/usr/bin/env python3
"""v768 : fonds d'ouverture des boosters (images Gemini 9:16 avec bandes noires en haut et en bas).
python3 tools/open-bg.py <clé> <image> [haut bas]
Garde la scène (bandes et « Helper Text » retirés), la pose en 720 × 1290, bas de la scène à 1260 px,
et refait le haut en reflet flou qui s'assombrit vers le noir. Sortie : assets/ui/open/<clé>.webp,
source gardée dans store/ouverture/open-<clé>-source.jpg."""
import sys, shutil
import numpy as np
from PIL import Image, ImageFilter
W, H, BOT = 720, 1290, 1260
key, src = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
a = np.asarray(im.convert('L')).astype(float)
sd, m = a.std(axis=1), a.mean(axis=1)
flat = (sd < 3.5) & (m < 40)
def edge(y, step):
    while 0 < y < a.shape[0] - 1:
        if all(flat[y + k * step] for k in range(4) if 0 <= y + k * step < a.shape[0]): return y
        y += step
    return y
top, bot = (int(sys.argv[3]), int(sys.argv[4])) if len(sys.argv) > 4 else (edge(a.shape[0] // 2, -1) + 2, edge(a.shape[0] // 2, 1) - 2)
scene = im.crop((0, top, im.width, bot))
h = round(scene.height * W / scene.width)
scene = scene.resize((W, h), Image.LANCZOS)
y0 = BOT - h
can = Image.new('RGB', (W, H), (8, 7, 12))
if y0 > 0:  # haut : reflet de la scène, flou, qui s'éteint vers le noir
    band = scene.crop((0, 0, W, min(h, y0 + 60))).transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(18))
    ext = Image.new('RGB', (W, y0 + 60), (8, 7, 12)); ext.paste(band.crop((0, band.height - (y0 + 60), W, band.height)) if band.height >= y0 + 60 else band, (0, 0))
    g = np.linspace(0, 1, y0 + 60)[:, None, None] ** 1.6 * 0.55
    e = (np.asarray(ext).astype(float) * g + np.array([8, 7, 12]) * (1 - g)).astype(np.uint8)
    can.paste(Image.fromarray(e), (0, 0))
# scène, fondue sur 60 px dans le reflet
sc = np.asarray(scene).astype(float); base = np.asarray(can).astype(float)
for y in range(h):
    yy = y0 + y
    if 0 <= yy < H:
        t = min(1, y / 60) if y0 > 0 else 1
        base[yy] = sc[y] * t + base[yy] * (1 - t)
# bas : fondu vers le noir sur les 30 derniers pixels
for yy in range(BOT - 40, H):
    t = max(0, (H - yy) / (H - BOT + 40)); base[yy] = base[yy] * t + np.array([8, 7, 12]) * (1 - t)
Image.fromarray(base.astype(np.uint8)).save(f'assets/ui/open/{key}.webp', quality=78, method=6)
shutil.copy(src, f'store/ouverture/open-{key}-source.jpg')
print(key, 'scène', top, bot, '→ y', y0, 'à', BOT)
