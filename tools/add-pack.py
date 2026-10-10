"""Ajoute un visuel de booster : repère le paquet sur son fond uni (noir ou blanc),
le découpe en rectangle et l'enregistre en WebP 464 x 800. Les bords dentelés
sont appliqués par le jeu (masque CSS), ce qui évite de rogner les zones sombres.
Usage : python3 tools/add-pack.py <clé> <image>
Clés : standard, premium, event, infernal, abyssal, celeste, sauvage, necrotique, primordial, artificiel"""
import sys, pathlib
from PIL import Image

root = pathlib.Path(__file__).resolve().parent.parent
if len(sys.argv) < 3:
    sys.exit(__doc__)
key, src = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
w, h = im.size
px = im.load()

def bg(c):
    r, g, b = c
    return (r < 30 and g < 30 and b < 30) or (r > 225 and g > 225 and b > 225)

cols = [x for x in range(w) if sum(not bg(px[x, y]) for y in range(0, h, 2)) > 0.35 * h / 2]
rows = [y for y in range(h) if sum(not bg(px[x, y]) for x in range(0, w, 2)) > 0.35 * w / 2]
box = (cols[0], rows[0], cols[-1] + 1, rows[-1] + 1)
im = im.crop(box).resize((464, 800), Image.LANCZOS)
dest = root / 'assets/packs' / f'{key}.webp'
im.save(dest, 'WEBP', quality=86, method=6)
print(f'{dest.relative_to(root)} ({dest.stat().st_size // 1024} Ko), découpe {box}')
