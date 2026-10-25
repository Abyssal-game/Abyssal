#!/usr/bin/env python3
"""v779 : planche Gemini (grille d'images, 4 colonnes x 2 rangées par défaut) -> bande horizontale pour un gros plan animé
des cinématiques (8 images de 300 x 375, format 4:5, lues dans l'ordre de lecture).
Usage : python3 tools/cine-sheet.py source.jpg assets/prologue/sceau.webp [colonnes rangées] [marge]
marge = part de chaque case retirée sur ses bords (0.03 par défaut : les fins traits entre les cases)."""
import sys
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4
rows = int(sys.argv[4]) if len(sys.argv) > 4 else 2
inset = float(sys.argv[5]) if len(sys.argv) > 5 else 0.03
W, H = 300, 375
im = Image.open(src).convert('RGB')
cw, ch = im.width / cols, im.height / rows
frames = []
for r in range(rows):
    for c in range(cols):
        x0, y0 = c * cw + cw * inset, r * ch + ch * inset
        x1, y1 = (c + 1) * cw - cw * inset, (r + 1) * ch - ch * inset
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
