# v873 : images du cercle des gros coups (Gemini, sources dans store/defense/) -> assets/ui/def/*.webp
# Anneaux sur fond noir : le noir devient transparent (alpha = canal le plus clair), chaque anneau est recadré pour que
# sa ligne la plus brillante tombe à 40 % de la largeur depuis le centre (les trois anneaux se superposent exactement).
# Sceau (fond blanc) et rosace (fond noir) : découpés en disque. Usage : python3 tools/def-ring-art.py
from PIL import Image, ImageDraw
import numpy as np
S, OUT = 'store/defense', 'assets/ui/def'

def unblack(img):
    a = np.asarray(img.convert('RGB')).astype(float)
    al = a.max(2)
    al = np.clip((al - 8) * 255 / 247, 0, 255)
    rgb = np.where(al[..., None] > 0, np.clip(a * 255 / np.maximum(al[..., None], 1), 0, 255), 0)
    return Image.fromarray(np.dstack([rgb, al]).astype(np.uint8), 'RGBA')

def ring(name, out, size=320, frac=0.40):
    img = Image.open(f'{S}/{name}-source.jpg').convert('RGB')
    a = np.asarray(img).astype(float).max(2)
    ys, xs = np.where(a > 180); cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    yy, xx = np.indices(a.shape); r = np.hypot(xx - cx, yy - cy).astype(int)
    prof = np.bincount(r.ravel(), a.ravel()) / np.maximum(np.bincount(r.ravel()), 1)
    peak = int(np.argmax(prof[50:500]) + 50)
    half = peak / frac / 2
    box = (int(cx - half), int(cy - half), int(cx + half), int(cy + half))
    unblack(img.crop(box)).resize((size, size), Image.LANCZOS).save(f'{OUT}/{out}.webp', quality=88, method=6)
    print(name, 'centre', int(cx), int(cy), 'rayon', peak)

def disc(name, out, size, white):
    img = Image.open(f'{S}/{name}-source.jpg').convert('RGB')
    a = np.asarray(img.convert('L')).astype(float)
    ys, xs = np.where(a < 200) if white else np.where(a > 25)
    cx, cy, r = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2, min(xs.max() - xs.min(), ys.max() - ys.min()) / 2 - 4
    im = img.crop((int(cx - r), int(cy - r), int(cx + r), int(cy + r))).resize((size * 4, size * 4), Image.LANCZOS).convert('RGBA')
    m = Image.new('L', im.size, 0); ImageDraw.Draw(m).ellipse((2, 2, im.size[0] - 2, im.size[1] - 2), fill=255)
    im.putalpha(m); im.resize((size, size), Image.LANCZOS).save(f'{OUT}/{out}.webp', quality=88, method=6)
    print(name, 'disque', int(cx), int(cy), int(r))

disc('sceau', 'seal', 240, True)
disc('rosace', 'rosace', 320, False)
ring('anneau-cible', 'target')
ring('anneau', 'ring')
ring('anneau-rapide', 'ring-fast')
