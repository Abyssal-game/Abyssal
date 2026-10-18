# Usage : python3 tools/frame-art.py <clé> <source.jpg> [K]   (v472 : cadres de profil Gemini du Codex et de l'Échoppe)
# Anneau sur fond blanc, centre blanc vide → assets/frames/<clé>.webp (256 × 256, transparent).
# Le fond (relié au bord) et le trou central (relié au centre) deviennent transparents ; l'image est recentrée sur le
# trou, dont le rayon vaut 1 / K de la demi-image (K = 1,6 par défaut) : en CSS, le cadre déborde de l'avatar de
# (K − 1) / 2 de chaque côté, la photo du joueur remplit exactement le trou.
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

key, src = sys.argv[1], sys.argv[2]
K = float(sys.argv[3]) if len(sys.argv) > 3 else 1.6
im = Image.open(src).convert('RGB')
a = np.asarray(im, float)
H, W, _ = a.shape
white = a.min(-1) > 226
def flood(mask, seeds):
    img = Image.fromarray(np.where(mask, 255, 0).astype(np.uint8)).copy()
    for (x, y) in seeds:
        if img.getpixel((x, y)) == 255: ImageDraw.floodfill(img, (x, y), 128, thresh=0)
    return np.asarray(img) == 128
edge = [(x, 0) for x in range(0, W, 8)] + [(x, H - 1) for x in range(0, W, 8)] + [(0, y) for y in range(0, H, 8)] + [(W - 1, y) for y in range(0, H, 8)]
outside = flood(white, edge)
hole = flood(white, [(W // 2, H // 2), (W // 2 + 20, H // 2), (W // 2, H // 2 + 20)])
ys, xs = np.where(hole)
cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
r_in = ((xs.max() - xs.min()) + (ys.max() - ys.min())) / 4
bg = outside | hole
obj = ~bg
# alpha doux sur la frange (écart au blanc), couleur dé-mélangée du blanc
dist = (255 - a.min(-1)) / 255
grow = np.asarray(Image.fromarray((obj * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)), bool)
shrink = np.asarray(Image.fromarray((obj * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)), bool)
fr = grow & ~shrink
alpha = np.where(obj, 1.0, 0.0)
alpha = np.where(fr, np.clip(dist * 3.2, 0, 1), alpha)
pale = (a.min(-1) > 150) & ((a.max(-1) - a.min(-1)) < 40)            # halos, reflets pâles : semi-transparents
alpha = np.where(pale & obj, np.minimum(alpha, np.clip((255 - a.min(-1)) / 105, 0, 1)), alpha)
alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)), float) / 255
alpha = np.where(bg & ~fr, 0, alpha)
with np.errstate(divide='ignore', invalid='ignore'):
    col = np.clip((a - (1 - alpha[..., None]) * 255) / np.maximum(alpha[..., None], 0.3), 0, 255)
rgba = Image.fromarray(np.dstack([col, alpha * 255]).astype(np.uint8), 'RGBA')
half = r_in * K
oy, ox = np.where(alpha > 0.1)
reach = max(np.hypot(ox - cx, oy - cy).max() / r_in, 0)
canvas = Image.new('RGBA', (int(2 * half), int(2 * half)), (0, 0, 0, 0))
canvas.paste(rgba, (int(round(half - cx)), int(round(half - cy))))
canvas.resize((256, 256), Image.LANCZOS).save(f'assets/frames/{key}.webp', quality=88, method=6)
print(f'{key}: centre {cx:.0f},{cy:.0f} rayon intérieur {r_in:.0f}, portée {reach:.2f} (K {K}){"  ← coupé" if reach > K * 1.41 else ""}')
