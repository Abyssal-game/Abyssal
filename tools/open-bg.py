#!/usr/bin/env python3
"""v768 : fonds d'ouverture des boosters (images Gemini 9:16 avec bandes noires en haut et en bas).
python3 tools/open-bg.py <clé> <image> [haut bas [stèle]]
(v770 : stèle = hauteur, dans l'image source, du dessus du socle ; il est posé à 73,5 % de l'écran, là où repose le sachet)
Garde la scène (bandes et « Helper Text » retirés), la pose en 720 × 1290, bas de la scène à 1260 px,
et refait le haut en reflet flou qui s'assombrit vers le noir. Sortie : assets/ui/open/<clé>-2.webp (v770 : nouveau nom, pas de copie périmée servie),
source gardée dans store/ouverture/open-<clé>-source.jpg."""
import sys, shutil, os
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
PL = int(sys.argv[5]) if len(sys.argv) > 5 else None
y0 = round(0.735 * H - (PL - top) * W / im.width) if PL else BOT - h
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
# v770 : scène trop haute : le bas est refait en reflet flou qui s'éteint
yb = y0 + h
if yb < H:
    n = H - yb
    band = scene.crop((0, max(0, h - n), W, h)).transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(18))
    bb = np.asarray(band.resize((W, n))).astype(float)
    g = (1 - np.linspace(0, 1, n))[:, None, None] ** 1.4 * 0.5
    base[yb:H] = bb * g + np.array([8, 7, 12]) * (1 - g)
    for k in range(min(40, h)):  # raccord fondu
        t = k / 40; yy = yb - 40 + k
        if 0 <= yy < H: base[yy] = base[yy] * (1 - t * 0.35) + np.array([8, 7, 12]) * (t * 0.35)
# bas : fondu vers le noir sur les 30 derniers pixels
for yy in range(BOT - 40, H):
    t = max(0, (H - yy) / (H - BOT + 40)); base[yy] = base[yy] * t + np.array([8, 7, 12]) * (1 - t)
Image.fromarray(base.astype(np.uint8)).save(f'assets/ui/open/{key}-2.webp', quality=78, method=6)
dst = f'store/ouverture/open-{key}-source.jpg'
if os.path.abspath(src) != os.path.abspath(dst): shutil.copy(src, dst)
print(key, 'scène', top, bot, '→ y', y0, 'à', BOT)
