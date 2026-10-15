#!/usr/bin/env python3
"""Fabrique toutes les images de marque du jeu à partir des deux images sources du logo (Gemini) :
  store/logo/embleme-source.jpg  (carré : le Sceau fendu, sans texte)
  store/logo/logo-source.jpg     (paysage : le mot ABYSSAL avec le sceau, sur fond noir)

Sorties : icons/ (PWA, iPhone, favicon), assets/brand/ (logo du jeu, emblème rond, fond de l'écran
d'ouverture), store/apple/icone-1024.png, store/google/icone-512.png, et les icônes de l'application
Android (android/app/src/main/res/mipmap-*, écrans de démarrage).
Usage : python3 tools/brand.py
"""
import os, glob
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)

emb = Image.open(P('store/logo/embleme-source.jpg')).convert('RGB')
logo = Image.open(P('store/logo/logo-source.jpg')).convert('RGB')
BG = tuple(int(v) for v in np.asarray(emb)[4:12, 4:12].reshape(-1, 3).mean(axis=0))  # fond de l'emblème (coin)
BG_HEX = '#%02X%02X%02X' % BG


def disc_geometry(img):
    """Centre et rayon du sceau : étendue des pixels nettement plus clairs que le fond sur la ligne et la colonne du milieu."""
    a = np.asarray(img).max(axis=2)
    cy, cx = a.shape[0] // 2, a.shape[1] // 2
    xs = np.where(a[cy] > 60)[0]; ys = np.where(a[:, cx] > 60)[0]
    return (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2, max(xs.max() - xs.min(), ys.max() - ys.min()) / 2


ECX, ECY, ER = disc_geometry(emb)
print(f'emblème : disque centré en ({ECX:.0f}, {ECY:.0f}), rayon {ER:.0f} px sur {emb.width}')


def square_crop(frac, size):
    """Carré centré sur le sceau, où le disque occupe `frac` de la largeur, ramené à `size` px."""
    side = 2 * ER / frac
    box = (ECX - side / 2, ECY - side / 2, ECX + side / 2, ECY + side / 2)
    if box[0] < 0 or box[1] < 0 or box[2] > emb.width or box[3] > emb.height:
        # marge insuffisante : on agrandit la toile avec la couleur du fond
        pad = int(max(-box[0], -box[1], box[2] - emb.width, box[3] - emb.height)) + 2
        big = Image.new('RGB', (emb.width + 2 * pad, emb.height + 2 * pad), BG); big.paste(emb, (pad, pad))
        box = tuple(v + pad for v in box)
        src = big
    else:
        src = emb
    return src.crop(tuple(int(round(v)) for v in box)).resize((size, size), Image.LANCZOS)


def disc_cutout(size, halo=0.0):
    """Le sceau détouré (RGBA) : opaque dans le disque, puis fondu du halo jusqu'à `halo` × rayon."""
    r_out = ER * (1 + halo) + 2
    side = int(2 * r_out)
    crop = emb.crop((int(ECX - r_out), int(ECY - r_out), int(ECX + r_out), int(ECY + r_out)))
    y, x = np.mgrid[0:crop.height, 0:crop.width]
    d = np.hypot(x - crop.width / 2, y - crop.height / 2)
    alpha = np.clip((r_out - d) / max(1.0, r_out - ER), 0, 1) if halo > 0 else np.clip(ER + 1.5 - d, 0, 1)
    out = Image.fromarray(np.dstack([np.asarray(crop), (alpha * 255).astype(np.uint8)]), 'RGBA')
    return out.resize((size, size), Image.LANCZOS)


def on_bg(rgba, size, disc_frac):
    """Fond uni + sceau détouré avec son halo, disque à `disc_frac` de la largeur (icônes « maskable » / Android)."""
    canvas = Image.new('RGB', (size, size), BG)
    halo = 0.3
    cut = disc_cutout(int(size * disc_frac * (1 + halo)), halo)
    canvas.paste(cut, ((size - cut.width) // 2, (size - cut.height) // 2), cut)
    return canvas


def round_mask(img):
    m = Image.new('L', (img.width * 4, img.height * 4), 0)
    ImageDraw.Draw(m).ellipse((0, 0, m.width - 1, m.height - 1), fill=255)
    m = m.resize(img.size, Image.LANCZOS)
    out = Image.new('RGBA', img.size, (0, 0, 0, 0)); out.paste(img, (0, 0), m)
    return out


def logo_cutout():
    """Le logo complet détouré : noir → transparent (halo semi-transparent), disque du sceau et lettres opaques."""
    a = np.asarray(logo).astype(np.float32)
    lum = a.max(axis=2)
    T, F = 70.0, 18.0  # sous F : fond (transparent) ; entre F et T : translucide (halo violet) ; au-dessus : opaque (lettres, or)
    alpha = np.clip((lum - F) / (T - F), 0, 1)
    # le disque du sceau reste opaque (son obsidienne est sombre) : anneau détecté sur la ligne de l'œil
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    gold = (R > 130) & (G > 95) & (B < 130) & (R - B > 50)
    cols = np.where(gold.any(axis=0))[0]; rows = np.where(gold.any(axis=1))[0]
    top = rows.min()
    # colonne du centre de l'anneau = milieu des pixels dorés sur les lignes au-dessus des lettres
    band = gold[top:top + 120]; xs = np.where(band.any(axis=0))[0]
    cx = (xs.min() + xs.max()) / 2
    # rayon : largeur maximale de l'anneau sur les 60 % supérieurs de l'image
    widths = [(np.where(gold[y])[0].max() - np.where(gold[y])[0].min()) / 2 for y in range(top, int(a.shape[0] * 0.6)) if gold[y].any()]
    r = max(widths); cy = top + r
    y, x = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    d = np.hypot(x - cx, y - cy)
    disc = np.clip((r + 40 - d) / 40, 0, 1)
    alpha = np.maximum(alpha, disc)
    # couleur « dé-prémultipliée » pour que le rendu sur fond noir soit identique à l'original
    k = np.where(alpha > 0, np.minimum(1.0 / np.maximum(alpha, 1e-3), 255.0 / np.maximum(lum, 1e-3)), 1.0)[..., None]
    rgb = np.clip(a * k, 0, 255).astype(np.uint8)
    out = Image.fromarray(np.dstack([rgb, (alpha * 255).astype(np.uint8)]), 'RGBA')
    bbox = Image.fromarray((alpha > 0.02).astype(np.uint8) * 255, 'L').getbbox()
    out = out.crop(bbox)
    # position de l'œil (iris orange) dans l'image détourée, pour la lueur animée de l'écran d'ouverture
    sub = a[int(cy - 0.3 * r):int(cy + 0.3 * r), int(cx - 0.3 * r):int(cx + 0.3 * r)]
    iris = (sub[..., 0] > 215) & (sub[..., 1] > 120) & (sub[..., 1] < 205) & (sub[..., 2] < 70)
    iy, ix = np.where(iris)
    eye = ((ix.mean() + cx - 0.3 * r - bbox[0]) / out.width, (iy.mean() + cy - 0.3 * r - bbox[1]) / out.height, (ix.max() - ix.min()) / out.width)
    return out, eye


# ——— icônes PWA / iPhone ———
os.makedirs(P('icons'), exist_ok=True)
square_crop(0.86, 512).save(P('icons/icon-512.png'), optimize=True)
square_crop(0.86, 192).save(P('icons/icon-192.png'), optimize=True)
square_crop(0.86, 180).save(P('icons/apple-touch-icon.png'), optimize=True)
square_crop(0.94, 64).save(P('icons/favicon.png'), optimize=True)
on_bg(None, 512, 0.74).save(P('icons/icon-maskable-512.png'), optimize=True)
# ——— stores ———
square_crop(0.86, 1024).save(P('store/apple/icone-1024.png'), optimize=True)
square_crop(0.86, 512).save(P('store/google/icone-512.png'), optimize=True)
# ——— images du jeu ———
disc_cutout(320).save(P('assets/brand/emblem.webp'), quality=92, method=6)
title, eye = logo_cutout()
w = 1200; title.resize((w, int(title.height * w / title.width)), Image.LANCZOS).save(P('assets/brand/title.webp'), quality=92, method=6)
print(f'logo détouré : {title.width}×{title.height} → title.webp ; œil à ({eye[0]*100:.1f} %, {eye[1]*100:.1f} %), largeur {eye[2]*100:.1f} %')
# fond de l'écran d'ouverture : dégradé sombre, sans dessin (le logo porte son propre halo)
bg = Image.new('RGB', (720, 1290)); px = bg.load()
for yy in range(1290):
    t = yy / 1289
    px[0, yy] = (int(BG[0] + (5 - BG[0]) * t), int(BG[1] + (4 - BG[1]) * t), int(BG[2] + (7 - BG[2]) * t))
for xx in range(1, 720):
    for yy in range(1290): px[xx, yy] = px[0, yy]
bg.save(P('assets/brand/loading.webp'), quality=80, method=6)
# ——— Android ———
R = P('android/app/src/main/res')
if os.path.isdir(R):
    icon = square_crop(0.86, 512)
    for d, k in {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}.items():
        s = round(48 * k)
        icon.resize((s, s), Image.LANCZOS).save(f'{R}/mipmap-{d}/ic_launcher.png', optimize=True)
        round_mask(icon.resize((s, s), Image.LANCZOS)).save(f'{R}/mipmap-{d}/ic_launcher_round.png', optimize=True)
        f = round(108 * k)
        on_bg(None, f, 0.60).save(f'{R}/mipmap-{d}/ic_launcher_foreground.png', optimize=True)  # zone sûre : 66 dp sur 108
    with open(f'{R}/values/ic_launcher_background.xml', 'w') as fh:
        fh.write(f'<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">{BG_HEX}</color>\n</resources>\n')
    for p in glob.glob(f'{R}/drawable*/splash.png'):
        w0, h0 = Image.open(p).size
        sp = Image.new('RGB', (w0, h0), BG); e = round(min(w0, h0) * 0.42)
        cut = disc_cutout(e, 0.3); sp.paste(cut, ((w0 - e) // 2, (h0 - e) // 2), cut); sp.save(p, optimize=True)
print('fond', BG_HEX, '· icônes, emblème, logo, Android : refaits')
