#!/usr/bin/env python3
"""Planche d'effet Gemini (grille de 8 images sur fond noir) -> bande d'animation du jeu (2048 x 256, 8 images de 256).

Usage : python3 tools/fx-sheet.py source.jpg assets/fx/<nom>.webp [colonnes=4] [lignes=2]
La grille est lue de gauche à droite puis de haut en bas. Chaque case est recadrée en carré autour de son centre,
le fond est ramené au noir pur (le jeu affiche ces planches en mode « screen » : le noir devient transparent),
puis les 8 images sont mises bout à bout.
"""
import sys
from PIL import Image, ImageOps

src, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4
rows = int(sys.argv[4]) if len(sys.argv) > 4 else 2
im = Image.open(src).convert('RGB')
W, H = im.size
cw, ch = W / cols, H / rows
side = int(min(cw, ch) * 0.96)
frames = []
for r in range(rows):
    for c in range(cols):
        cx, cy = (c + 0.5) * cw, (r + 0.5) * ch
        f = im.crop((int(cx - side / 2), int(cy - side / 2), int(cx + side / 2), int(cy + side / 2))).resize((256, 256), Image.LANCZOS)
        # noir pur : les pixels très sombres (fond, traces de compression) deviennent 0, sans toucher aux lueurs
        f = f.point(lambda v: 0 if v < 14 else int((v - 14) * 255 / 241))
        # bords de case adoucis vers le noir (pas de coupure nette si l'effet déborde un peu)
        mask = Image.new('L', (256, 256), 0)
        inner = Image.new('L', (232, 232), 255)
        mask.paste(inner, (12, 12))
        from PIL import ImageFilter
        mask = mask.filter(ImageFilter.GaussianBlur(8))
        f = Image.composite(f, Image.new('RGB', (256, 256)), mask)
        frames.append(f)
strip = Image.new('RGB', (256 * len(frames), 256))
for i, f in enumerate(frames):
    strip.paste(f, (256 * i, 0))
strip.save(out, quality=88)
print(f'{out} : {len(frames)} images, {strip.size[0]} x {strip.size[1]}')
