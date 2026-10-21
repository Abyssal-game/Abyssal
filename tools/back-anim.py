#!/usr/bin/env python3
"""v565 : « dos vivant » : anime un dos de carte fixe (assets/backs/<clé>.webp, fait par back-art.py) en WebP animé qui boucle.
Usage : python3 tools/back-anim.py <clé> <mode>     modes : bougies (flammes qui vacillent + rubis qui pulse),
        aurore (aurore qui ondule + étoile de givre qui scintille), coeur (lumière rouge qui bat, deux coups).
L'image fixe est gardée dans store/backs/<clé>-fixe.webp ; le jeu affiche le fichier animé partout où il montre le dos
(fond CSS : aucun code à ajouter, Safari lit les WebP animés).
"""
import os, sys, shutil, math
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
key, mode = sys.argv[1], sys.argv[2]
src = os.path.join(ROOT, 'assets/backs', f'{key}.webp')
fixe = os.path.join(ROOT, 'store/backs', f'{key}-fixe.webp')
if not os.path.exists(fixe): shutil.copy(src, fixe)
im = Image.open(fixe).convert('RGBA')
a = np.asarray(im).astype(np.float32)
rgb, al = a[..., :3], a[..., 3:]
R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
H, W = R.shape
lum = rgb.max(axis=2)
blur = lambda m, r: np.asarray(Image.fromarray(np.clip(m * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255
N, DUR = 18, 90  # 18 images de 90 ms : boucle de 1,6 s
rng = np.random.default_rng(7)
yy, xx = np.mgrid[0:H, 0:W]

if mode == 'bougies':
    flame = ((R > 200) & (G > 150) & (B < 170)).astype(np.float32)
    ruby = ((R > 140) & (G < 90) & (B < 110) & (abs(xx - W / 2) < W * .22) & (abs(yy - H / 2) < H * .2)).astype(np.float32)
    mf, mr = blur(flame, 2.5), blur(ruby, 3)
    hf, hr = blur(flame, 10), blur(ruby, 22)
    noise = [blur(rng.random((H, W)).astype(np.float32), 18) for _ in range(6)]
    def frame(t):
        k = t * 6 / N; i = int(k) % 6; f = k - int(k)
        nz = (noise[i] * (1 - f) + noise[(i + 1) % 6] * f - .5) * 9  # vacillement propre à chaque flamme
        flick = 1 + .45 * np.clip(nz, -1, 1)
        beat = .5 - .5 * math.cos(2 * math.pi * t / N)
        out = rgb * (1 + ((flick - 1) * mf + .35 * beat * mr)[..., None])
        out += hf[..., None] * np.array([255, 170, 70]) * (.18 + .12 * np.clip(nz, -1, 1))[..., None]
        out += hr[..., None] * np.array([255, 40, 50]) * (.12 + .3 * beat)
        return out
elif mode == 'aurore':
    band = ((yy < H * .26) & (((G > R + 30) & (G > 90)) | ((B > R + 20) & (R > 90) & (B > 120)))).astype(np.float32)
    star = ((lum > 200) & (B >= R) & (abs(xx - W / 2) < W * .2) & (abs(yy - H * .45) < H * .16)).astype(np.float32)
    mb, ms, hs = blur(band, 3), blur(star, 2), blur(star, 18)
    def frame(t):
        ph = 2 * math.pi * t / N
        wave = 1 + .55 * np.sin(2 * math.pi * xx / (W * .55) - ph) * np.sin(math.pi * yy / (H * .26) + ph / 2)
        tw = .5 - .5 * math.cos(ph * 2)
        out = rgb * (1 + ((wave - 1) * mb + .4 * tw * ms)[..., None])
        out += hs[..., None] * np.array([150, 210, 255]) * (.1 + .35 * tw)
        return out
elif mode == 'coeur':
    red = ((R > 110) & (R > G * 1.8) & (R > B * 1.5) & (abs(xx - W / 2) < W * .3) & (abs(yy - H / 2) < H * .22)).astype(np.float32)
    mr, hr = blur(red, 3), blur(red, 26)
    def frame(t):
        p = t / N  # deux coups rapprochés, puis repos
        b = math.exp(-((p - .12) / .05) ** 2) + .75 * math.exp(-((p - .3) / .05) ** 2)
        out = rgb * (1 + .55 * b * mr[..., None])
        out += hr[..., None] * np.array([255, 30, 40]) * (.08 + .4 * b)
        return out
else:
    sys.exit(__doc__)

frames = [Image.fromarray(np.dstack([np.clip(frame(t), 0, 255), al]).astype(np.uint8), 'RGBA') for t in range(N)]
frames[0].save(src, 'WEBP', save_all=True, append_images=frames[1:], duration=DUR, loop=0, quality=66, method=5)
print(src, os.path.getsize(src) // 1024, 'Ko', N, 'images')
