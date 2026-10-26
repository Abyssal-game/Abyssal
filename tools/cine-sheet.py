#!/usr/bin/env python3
"""v779 : planche Gemini (grille d'images, 4 colonnes x 2 rangées par défaut) -> bande horizontale pour un gros plan animé
des cinématiques (8 images de 300 x 375, format 4:5, lues dans l'ordre de lecture).
Usage : python3 tools/cine-sheet.py source.jpg assets/prologue/sceau.webp [colonnes rangées] [marge]
marge = part de chaque case retirée sur ses bords (0.03 par défaut : les fins traits entre les cases).
v781 : --boxes="x0,y0,x1,y1;…" (cases données à la main, dans l'ordre de lecture, pour une grille irrégulière)
et --size=LxH (taille d'une image, 300x375 par défaut)."""
import sys
from PIL import Image

opts = {a.split('=')[0]: a.split('=', 1)[1] for a in sys.argv if a.startswith('--')}
args = [a for a in sys.argv[1:] if not a.startswith('--')]
src, out = args[0], args[1]
cols = int(args[2]) if len(args) > 2 else 4
rows = int(args[3]) if len(args) > 3 else 2
inset = float(args[4]) if len(args) > 4 else 0.03
W, H = (int(v) for v in opts.get('--size', '300x375').split('x'))
im = Image.open(src).convert('RGB')
cw, ch = im.width / cols, im.height / rows
if '--boxes' in opts:
    boxes = [tuple(int(v) for v in b.split(',')) for b in opts['--boxes'].split(';')]
else:
    boxes = [(c * cw + cw * inset, r * ch + ch * inset, (c + 1) * cw - cw * inset, (r + 1) * ch - ch * inset) for r in range(rows) for c in range(cols)]
frames = []
for (x0, y0, x1, y1) in boxes:
        cell = im.crop((round(x0), round(y0), round(x1), round(y1)))
        # recadrage au centre en 4:5
        k = W / H
        if cell.width / cell.height > k:
            nw = round(cell.height * k); dx = (cell.width - nw) // 2
            cell = cell.crop((dx, 0, dx + nw, cell.height))
        else:
            nh = round(cell.width / k); dy = (cell.height - nh) // 2
            cell = cell.crop((0, dy, cell.width, dy + nh))
        frames.append(cell.resize((W, H), Image.LANCZOS))
strip = Image.new('RGB', (W * len(frames), H))
for i, f in enumerate(frames):
    strip.paste(f, (i * W, 0))
strip.save(out, 'WEBP', quality=80, method=6)
print(out, strip.size, len(frames), 'images')
