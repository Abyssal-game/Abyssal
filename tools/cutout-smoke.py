# Usage : python3 tools/cutout-smoke.py source.jpg sortie.webp [fondu_bords=0.08]
# v393 : détourage « couleur vers transparence » pour une figure sombre faite de fumée sur fond clair (L'Abysse, forme finale) :
# chaque pixel devient transparent selon sa proximité avec la couleur du fond (fumées et lueurs pâles semi-transparentes,
# plus de franges blanches), couleur dé-mélangée du fond, et fondu doux vers les bords quand la figure touche le cadre.
import sys
import numpy as np
from PIL import Image, ImageFilter
src, dst = sys.argv[1], sys.argv[2]
edge = float(sys.argv[3]) if len(sys.argv) > 3 else 0.08
a = np.asarray(Image.open(src).convert('RGB'), float)
H, W, _ = a.shape
# couleur du fond : médiane des quatre coins
c = np.concatenate([a[:24, :24].reshape(-1, 3), a[:24, -24:].reshape(-1, 3), a[-24:, :24].reshape(-1, 3), a[-24:, -24:].reshape(-1, 3)])
bg = np.median(c, axis=0)
d = np.max(np.clip(bg - a, 0, None) / np.maximum(1, bg), axis=-1)  # assombrissement par rapport au fond (0 à 1), canal le plus touché
d = np.asarray(Image.fromarray((d * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(3)), float) / 255  # bruit de compression du fond
alpha = np.clip((d - 0.07) / 0.45, 0, 1) ** 0.8
# fondu vers les bords de l'image (ailes coupées par le cadre)
yy, xx = np.mgrid[0:H, 0:W]
m = np.minimum.reduce([xx / W, (W - 1 - xx) / W, yy / H, (H - 1 - yy) / H])
alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.5)), float) / 255
# la couleur se dé-mélange avec l'opacité « vraie » (avant le fondu des bords, sinon les bords noircissent)
with np.errstate(divide='ignore', invalid='ignore'):
    col = np.clip((a - (1 - alpha[..., None]) * bg) / np.maximum(alpha[..., None], 0.25), 0, 255)
alpha = alpha * np.clip(m / edge, 0, 1) ** 1.5
im = Image.fromarray(np.dstack([col, alpha * 255]).astype(np.uint8), 'RGBA')
ys, xs = np.where(alpha > 0.04)
im = im.crop((max(0, xs.min() - 2), max(0, ys.min() - 2), min(W, xs.max() + 3), min(H, ys.max() + 3)))
if im.height > 560: im = im.resize((round(im.width * 560 / im.height), 560), Image.LANCZOS)
im.save(dst, 'WEBP', quality=84, alpha_quality=90, method=6)
print(dst, im.size, 'fond', bg.round())
