# Usage : python3 tools/cutout-white.py source.jpg sortie.webp [--holes] [--soft]  (--soft : poussière et fumée pâles rendues semi-transparentes)   (v385 : figures des gardiens sur fond blanc uni)
# Détourage d'une figure sur fond blanc uni : fond = pixels presque blancs reliés au bord (+ grands trous blancs),
# bord adouci et couleur dé-mélangée du blanc ; recadrage serré puis hauteur 560.
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
src, dst = sys.argv[1], sys.argv[2]
holes = '--holes' in sys.argv
a = np.asarray(Image.open(src).convert('RGB'), float)
H, W, _ = a.shape
white = a.min(-1) > 228
def flood(mask, seeds):
    img = Image.fromarray(np.where(mask, 255, 0).astype(np.uint8)).copy()
    for (x, y) in seeds:
        if img.getpixel((x, y)) == 255: ImageDraw.floodfill(img, (x, y), 128, thresh=0)
    return np.asarray(img) == 128
seeds = [(x, 0) for x in range(0, W, 8)] + [(x, H - 1) for x in range(0, W, 8)] + [(0, y) for y in range(0, H, 8)] + [(W - 1, y) for y in range(0, H, 8)]
bg = flood(white, seeds)
if holes:
    rest = white & ~bg
    img = Image.fromarray(np.where(rest, 255, 0).astype(np.uint8)).copy()
    ys, xs = np.where(rest)
    for y, x in zip(ys[::5], xs[::5]):
        if img.getpixel((int(x), int(y))) != 255: continue
        im2 = img.copy(); ImageDraw.floodfill(im2, (int(x), int(y)), 128, thresh=0)
        comp = np.asarray(im2) == 128
        if comp.sum() > 400: bg |= comp
        img.paste(Image.fromarray(np.where(comp, 0, np.asarray(img)).astype(np.uint8)))
# petites taches isolées (abeilles, braises) gardées ; points blancs flottants supprimés : on érode le fond d'un pixel
obj = ~bg
# alpha doux : sur la frange, opacité selon l'écart au blanc
dist = (255 - a.min(-1)) / 255
edge = np.asarray(Image.fromarray((obj * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)), float) / 255 > 0
fr = edge & ~np.asarray(Image.fromarray((obj * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)), bool)
alpha = np.where(obj, 1.0, 0.0)
alpha = np.where(fr, np.clip(dist * 3.2, 0, 1), alpha)
alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)), float) / 255
alpha = np.where(bg & ~fr, 0, alpha)
if '--soft' in sys.argv:  # poussière, fumée : pixels pâles et peu colorés → transparence selon leur écart au blanc
    chroma = a.max(-1) - a.min(-1)
    pale = (a.min(-1) > 140) & (chroma < 40)
    alpha = np.where(pale, np.minimum(alpha, np.clip((255 - a.min(-1)) / 115, 0, 1)), alpha)
with np.errstate(divide='ignore', invalid='ignore'):
    col = np.clip((a - (1 - alpha[..., None]) * 255) / np.maximum(alpha[..., None], 0.3), 0, 255)
im = Image.fromarray(np.dstack([col, alpha * 255]).astype(np.uint8), 'RGBA')
ys, xs = np.where(alpha > 0.1)
im = im.crop((max(0, xs.min() - 4), max(0, ys.min() - 4), min(W, xs.max() + 5), min(H, ys.max() + 5)))
if im.height > 560: im = im.resize((round(im.width * 560 / im.height), 560), Image.LANCZOS)
im.save(dst, 'WEBP', quality=82, method=6)
print(dst, im.size)
