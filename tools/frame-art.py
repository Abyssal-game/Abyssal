# Usage : python3 tools/frame-art.py <clé> <source.jpg> [K]   (v472 : cadres de profil Gemini du Codex et de l'Échoppe)
# Anneau sur fond blanc, centre blanc vide → assets/frames/<clé>.webp (256 × 256, transparent).
# Le fond (relié au bord) et le trou central (relié au centre) deviennent transparents ; l'image est recentrée sur le
# trou, dont le rayon vaut 1 / K de la demi-image (K = 1,6 par défaut) : en CSS, le cadre déborde de l'avatar de
# (K − 1) / 2 de chaque côté, la photo du joueur remplit exactement le trou.
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# v487 : --fit = cadre ramené à une taille commune (trou à 64 % de la demi-image, bord extérieur à 97 % au plus :
# l'anneau trop épais est tassé vers le trou, la photo reste visible) → assets/frames/<clé>-2.webp ; en CSS inset −24,2 %.
args = [x for x in sys.argv[1:] if not x.startswith('--')]
FIT = '--fit' in sys.argv
key, src = args[0], args[1]
K = float(args[2]) if len(args) > 2 else 1.6
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
if FIT:
    N, HOLE, OUT = 1024, float(next((x.split('=')[1] for x in sys.argv if x.startswith('--hole=')), 0.64)), 0.97
    SUF = next((x.split('=')[1] for x in sys.argv if x.startswith('--suffix=')), '2')
    hc = N / 2
    d = np.hypot(*np.meshgrid(np.arange(W) - cx, np.arange(H) - cy))
    r_out = np.percentile(d[alpha > 0.25], 99.7)                  # bord extérieur (sans les poussières isolées)
    s0 = HOLE * hc / r_in
    k = min(s0, (OUT * hc - HOLE * hc) / max(r_out - r_in, 1))
    yy, xx = np.mgrid[0:N, 0:N] + 0.5 - hc
    rr = np.hypot(xx, yy)
    src_r = np.where(rr < HOLE * hc, rr / s0, r_in + (rr - HOLE * hc) / k)
    f = src_r / np.maximum(rr, 1e-6)
    sx, sy = cx + xx * f - 0.5, cy + yy * f - 0.5
    pm = np.dstack([col * alpha[..., None], alpha * 255])        # couleur prémultipliée pour l'interpolation
    x0, y0 = np.floor(sx).astype(int), np.floor(sy).astype(int)
    fx, fy = (sx - x0)[..., None], (sy - y0)[..., None]
    def at(x, y):
        ok = (x >= 0) & (x < W) & (y >= 0) & (y < H)
        v = pm[np.clip(y, 0, H - 1), np.clip(x, 0, W - 1)]
        return np.where(ok[..., None], v, 0)
    v = (at(x0, y0) * (1 - fx) * (1 - fy) + at(x0 + 1, y0) * fx * (1 - fy) + at(x0, y0 + 1) * (1 - fx) * fy + at(x0 + 1, y0 + 1) * fx * fy)
    al = v[..., 3:4]
    rgb = np.clip(v[..., :3] / np.maximum(al / 255, 1e-3), 0, 255)
    out = Image.fromarray(np.dstack([rgb, al]).astype(np.uint8), 'RGBA')
    out.resize((256, 256), Image.LANCZOS).save(f'assets/frames/{key}-{SUF}.webp', quality=88, method=6)
    print(f'{key}: anneau {r_out / r_in:.2f} × le trou → {"tassé ×" + format(k / s0, ".2f") if k < s0 else "gardé"}')
    sys.exit()
half = r_in * K
oy, ox = np.where(alpha > 0.1)
reach = max(np.hypot(ox - cx, oy - cy).max() / r_in, 0)
canvas = Image.new('RGBA', (int(2 * half), int(2 * half)), (0, 0, 0, 0))
canvas.paste(rgba, (int(round(half - cx)), int(round(half - cy))))
canvas.resize((256, 256), Image.LANCZOS).save(f'assets/frames/{key}.webp', quality=88, method=6)
print(f'{key}: centre {cx:.0f},{cy:.0f} rayon intérieur {r_in:.0f}, portée {reach:.2f} (K {K}){"  ← coupé" if reach > K * 1.41 else ""}')
