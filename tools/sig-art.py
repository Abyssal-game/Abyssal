# v788 : signature peinte (Gemini, fond blanc) -> encre détourée pour le vélin de la fin.
# python3 tools/sig-art.py <clé> <langue> [gain]
#   source : store/fin/sig-<clé>-<langue>-source.jpg  ->  assets/fin/sig-<clé>-<langue>.webp
#   [gain] opacité de l'encre (1,5 ; plus pour une encre pâle), [assombrir] 0-1 sur la couleur, [teinte] #rrggbb
# Le blanc devient transparent, la couleur de l'encre est dé-mélangée du blanc ;
# une petite marque isolée tout à gauche (apostrophe parasite de Gemini) est effacée.
import sys
import numpy as np
from PIL import Image

key, lang = sys.argv[1], sys.argv[2]
gain = float(sys.argv[3]) if len(sys.argv) > 3 else 1.5
dark_mul = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0  # assombrit l'encre (ex. 0.7)
suf = '' if lang == 'fr' else f'-{lang}'  # fr : la signature d'origine (sig-<clé>.webp)
src = Image.open(f'store/fin/sig-{key}{suf}-source.jpg').convert('RGB')
a = np.asarray(src).astype(np.float32) / 255.0

# fond : blanc presque pur ; seuil doux pour ne pas garder le grain du papier
dark = 1.0 - a.min(axis=2)
alpha = np.clip((dark - 0.04) / 0.96 * gain, 0, 1)
# couleur dé-mélangée : c = 1 - (1 - a) / alpha
safe = np.maximum(alpha, 1e-3)[..., None]
col = np.clip(1.0 - (1.0 - a) / safe, 0, 1)
col[alpha < 1e-3] = 0

# composantes d'encre (sans scipy) : on efface les poussières et la petite marque isolée
# que Gemini pose parfois devant le premier mot (apostrophe parasite)
from collections import deque
ink = alpha > 0.05
H, W = ink.shape
lab = np.zeros((H, W), np.int32); comps = []
for y0, x0 in zip(*np.nonzero(ink)):
    if lab[y0, x0]: continue
    n = len(comps) + 1; lab[y0, x0] = n; q = deque([(y0, x0)]); pts = []
    while q:
        y, x = q.popleft(); pts.append((y, x))
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                yy, xx = y + dy, x + dx
                if 0 <= yy < H and 0 <= xx < W and ink[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n; q.append((yy, xx))
    ys = [p[0] for p in pts]; xs = [p[1] for p in pts]
    comps.append((n, len(pts), min(xs), max(xs), min(ys), max(ys)))
total = sum(c[1] for c in comps)
big = [c for c in comps if c[1] > total * 0.01]
left = min(c[2] for c in big)
for n, area, x0, x1, y0, y1 in comps:
    lone = area < total * 0.006 and x1 < left
    dust = area < 12
    if lone or dust:
        alpha[lab == n] = 0
        if lone: print('marque isolée effacée', x0, x1)
# halo très faible restant autour (grain du papier) : coupé
keep = (lab > 0) & (alpha > 0)
for _ in range(2):  # on garde le bord adouci des lettres (2 px autour de l'encre)
    k = keep.copy()
    k[1:] |= keep[:-1]; k[:-1] |= keep[1:]; k[:, 1:] |= keep[:, :-1]; k[:, :-1] |= keep[:, 1:]
    keep = k
alpha[~keep] = 0
if dark_mul != 1: col *= dark_mul
# [teinte] #rrggbb : couleur de l'encre imposée (celle de la signature française), relief gardé
if len(sys.argv) > 5:
    t = np.array([int(sys.argv[5][i:i + 2], 16) for i in (1, 3, 5)], np.float32) / 255.0
    lum = col.mean(axis=2); ref = lum[alpha > 0.3].mean() if (alpha > 0.3).any() else 0.5
    col = np.clip(t[None, None, :] * (0.8 + 0.4 * lum / max(ref, 1e-3))[..., None], 0, 1)

out = np.dstack([col, alpha])
img = Image.fromarray((out * 255).round().astype(np.uint8), 'RGBA')
bb = img.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
m = 10
img = img.crop((max(0, bb[0] - m), max(0, bb[1] - m), min(img.width, bb[2] + m), min(img.height, bb[3] + m)))
if img.width > 900:
    img = img.resize((900, round(img.height * 900 / img.width)), Image.LANCZOS)
dst = f'assets/fin/sig-{key}{suf}.webp'
img.save(dst, 'WEBP', quality=88, method=6)
print(dst, img.size)
