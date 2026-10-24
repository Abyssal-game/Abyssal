#!/usr/bin/env python3
# v716 : carte de combat peinte d'un gardien (image Gemini verticale 3:4, gardien en pose de combat, décor intégré).
# Usage : python3 tools/boss-card.py <clé> <image> [décalage vertical -1..1]
# Clés : les 20 gardiens, plus abysse-2 (forme finale) et jumeaux-nuit (le Jumeau de la Nuit).
# Recadre en 5:7 (taille d'une carte de combat), 400 × 560 au plus, WebP → assets/bosses/combat-<clé>.webp ;
# la source est gardée dans store/bosses/combat-<clé>-source.jpg. Ajouter ensuite la clé à BOSS_CARD (js/screens/duel-ui.js).
import sys, os
from PIL import Image
k = sys.argv[1]; src = sys.argv[2]; shift = float(sys.argv[3]) if len(sys.argv) > 3 else 0.0
dst_src = f'store/bosses/combat-{k}-source.jpg'
im = Image.open(src).convert('RGB')
if os.path.abspath(src) != os.path.abspath(dst_src): im.save(dst_src, 'JPEG', quality=92)
W, H = im.size
h = round(W * 7 / 5)
if h > H: w = round(H * 5 / 7); x = (W - w) // 2; box = (x, 0, x + w, H)
else: y = round((H - h) / 2 * (1 + shift)); y = max(0, min(H - h, y)); box = (0, y, W, y + h)
cw = box[2] - box[0]; tw = min(400, cw)
out = im.crop(box).resize((tw, round(tw * 7 / 5)), Image.LANCZOS)
out.save(f'assets/bosses/combat-{k}.webp', 'WEBP', quality=82, method=6)
print(f'assets/bosses/combat-{k}.webp', out.size, os.path.getsize(f'assets/bosses/combat-{k}.webp') // 1024, 'Ko')
