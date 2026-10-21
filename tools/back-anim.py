#!/usr/bin/env python3
"""v565 : « dos vivant » : anime un dos de carte fixe (assets/backs/<clé>.webp, fait par back-art.py) en WebP animé qui boucle.
Usage : python3 tools/back-anim.py <clé> <mode> [--sachet]     modes : bougies (flammes qui vacillent + rubis qui pulse),
        aurore (aurore qui ondule + étoile de givre qui scintille), coeur (lumière rouge qui bat, deux coups),
        reflet:<teinte> (v573 : reflet en biais + cœur qui s'allume, pour tout dos),
        lueur:<teinte>[:<source>] (v569 : les couleurs vives proches de la teinte, en degrés, s'allument et s'éteignent
        doucement, les points les plus clairs scintillent ; <source> = dos fixe de départ s'il diffère de <clé>).
L'image fixe est gardée dans store/backs/<clé>-fixe.webp ; le jeu affiche le fichier animé partout où il montre le dos
(fond CSS : aucun code à ajouter, Safari lit les WebP animés).
"""
import os, sys, shutil, math
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
key, mode = sys.argv[1], sys.argv[2]
DIR = 'packs' if '--sachet' in sys.argv else 'backs'  # v572 : --sachet anime un sachet de booster (assets/packs/<clé>.webp)
src = os.path.join(ROOT, f'assets/{DIR}', f'{key}.webp')
fixe = os.path.join(ROOT, f'store/{DIR}', f'{key}-fixe.webp')
parts = mode.split(':')
if parts[0] == 'lueur' and len(parts) > 2 and not os.path.exists(fixe):  # dos vivant tiré d'un dos fixe existant
    shutil.copy(os.path.join(ROOT, f'assets/{DIR}', f'{parts[2]}.webp'), fixe)
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
elif parts[0] == 'lueur':
    hue0 = float(parts[1])
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    sat = (mx - mn) / np.maximum(mx, 1)
    hue = np.zeros_like(mx); d = np.maximum(mx - mn, 1e-3)
    hue = np.where(mx == R, ((G - B) / d) % 6, np.where(mx == G, (B - R) / d + 2, (R - G) / d + 4)) * 60
    dh = np.abs((hue - hue0 + 180) % 360 - 180)
    glow = ((sat > .35) & (mx > 70) & (dh < 28)).astype(np.float32) * np.clip(mx / 255, 0, 1)
    mg, hg = blur(glow, 2), blur(glow, 16)
    col = (rgb * glow[..., None]).sum(axis=(0, 1)) / max(glow.sum(), 1)
    col = col / max(col.max(), 1) * 255
    spark = ((mx > 225) & (sat < .5)).astype(np.float32)
    ms = blur(spark, 1.2)
    noise = [blur(rng.random((H, W)).astype(np.float32), 3) for _ in range(6)]
    def frame(t):
        ph = 2 * math.pi * t / N
        beat = .5 - .5 * math.cos(ph)
        k = t * 6 / N; i = int(k) % 6; f = k - int(k)
        tw = np.clip((noise[i] * (1 - f) + noise[(i + 1) % 6] * f - .5) * 8, -1, 1)
        out = rgb * (1 + (1.0 * beat * mg + .7 * tw * ms)[..., None])
        out += hg[..., None] * col * (.05 + .6 * beat)
        return out
elif parts[0] == 'reflet':  # v573 : pour tout dos : un reflet passe en biais sur les ornements, le cœur de la carte
    # (couleurs vives proches de la teinte, surtout au centre) s'allume, les points clairs scintillent. 24 images de 100 ms.
    N, DUR = 24, 100
    hue0 = float(parts[1])
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    sat = (mx - mn) / np.maximum(mx, 1)
    d = np.maximum(mx - mn, 1e-3)
    hue = np.where(mx == R, ((G - B) / d) % 6, np.where(mx == G, (B - R) / d + 2, (R - G) / d + 4)) * 60
    dh = np.abs((hue - hue0 + 180) % 360 - 180)
    rr = np.hypot((xx / W - .5) / .5, (yy / H - .5) / .5)
    centre = np.exp(-(rr / .55) ** 2)
    glow = ((sat > .3) & (mx > 60) & (dh < 30)).astype(np.float32) * np.clip(mx / 255, 0, 1) * (.25 + .75 * centre)
    mg, hg = blur(glow, 2), blur(glow, 18)
    col = (rgb * glow[..., None]).sum(axis=(0, 1)) / max(glow.sum(), 1)
    col = col / max(col.max(), 1) * 255 if glow.sum() > 50 else np.array([255, 220, 160])
    clair = mx[al[..., 0] > 128].mean() > 120  # dos à fond clair (marbre, papier) : ni reflet ni scintillement sur le fond
    metal = np.clip((mx - 70) / 140, 0, 1) * (al[..., 0] > 128) * (np.clip((sat - .12) / .2, 0, 1) if clair else 1)
    u = (xx / W) * .55 + (yy / H) * .45
    loc = np.asarray(Image.fromarray(mx.astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(np.float32)
    spark = ((mx > 205) & (sat < .55) & (mx - loc > 35)).astype(np.float32)
    ms = blur(spark, 1.2)
    noise = [blur(rng.random((H, W)).astype(np.float32), 3) for _ in range(6)]
    tint = (np.array([255, 245, 225]) * .6 + col * .4)
    def frame(t):
        p = t / N
        beat = .5 - .5 * math.cos(2 * math.pi * p)
        c = -.25 + 1.5 * min(p / .55, 1.2)  # le reflet traverse en 55 % de la boucle, puis repos
        band = np.exp(-((u - c) / .06) ** 2) * (p < .66)
        k = t * 6 / N; i = int(k) % 6; f = k - int(k)
        tw = np.clip((noise[i] * (1 - f) + noise[(i + 1) % 6] * f - .5) * 8, -1, 1)
        out = rgb * (1 + (.9 * beat * mg + .7 * tw * ms)[..., None])
        out += hg[..., None] * col * (.04 + .5 * beat)
        out += (band * metal * .55)[..., None] * tint
        return out
else:
    sys.exit(__doc__)

frames = [Image.fromarray(np.dstack([np.clip(frame(t), 0, 255), al]).astype(np.uint8), 'RGBA') for t in range(N)]
frames[0].save(src, 'WEBP', save_all=True, append_images=frames[1:], duration=DUR, loop=0, quality=62, method=5)
print(src, os.path.getsize(src) // 1024, 'Ko', N, 'images')
