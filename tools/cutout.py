#!/usr/bin/env python3
"""Détoure un accessoire peint sur fond blanc (images Gemini) : fond transparent, ombre portée gardée en douceur.

1. Le fond (blanc légèrement dégradé) est estimé à partir des bords de l'image.
2. Ce qui touche le bord et ressemble au fond devient transparent ; l'ombre grise et lisse qui le prolonge
   devient une ombre noire semi-transparente (elle se posera sur n'importe quel sol).
3. Les bords de l'objet sont adoucis et débarrassés du blanc qui bavait dessus ; l'image est recadrée.

Usage : python3 tools/cutout.py source.jpg sortie.webp [hauteur=420] [--holes] [--glow]
  --holes : retire aussi le fond vu à travers l'objet (roue dentée)
  --glow  : retire le halo lumineux teinté qui entoure l'objet (obélisque)
  --strict : retire aussi le liseré clair au pied d'un objet sombre (pas pour le marbre)
  --square=N : icône carrée de N pixels
"""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter


def fit_background(a, strip=24):
    h, w, _ = a.shape
    yy, xx = np.mgrid[0:h, 0:w]
    m = np.zeros((h, w), bool)
    m[:strip], m[-strip:], m[:, :strip], m[:, -strip:] = True, True, True, True
    x, y = xx[m] / w, yy[m] / h
    A = np.stack([np.ones_like(x), x, y, x * x, y * y, x * y], 1)
    X, Y = xx / w, yy / h
    B = np.stack([np.ones_like(X), X, Y, X * X, Y * Y, X * Y], -1)
    bg = np.zeros_like(a)
    for c in range(3):
        coef, *_ = np.linalg.lstsq(A, a[..., c][m], rcond=None)
        bg[..., c] = B @ coef
    return bg


def flood(mask):
    """Pixels de mask reliés au bord de l'image."""
    h, w = mask.shape
    img = Image.new('L', (w + 2, h + 2), 255)
    img.paste(Image.fromarray(np.where(mask, 255, 0).astype(np.uint8)), (1, 1))
    ImageDraw.floodfill(img, (0, 0), 128, thresh=0)
    return np.asarray(img)[1:-1, 1:-1] == 128


def local_std(lum, r=3):
    im = Image.fromarray(np.clip(lum, 0, 255).astype(np.uint8))
    m = np.asarray(im.filter(ImageFilter.BoxBlur(r)), float)
    m2 = np.asarray(Image.fromarray(np.clip(lum * lum / 255, 0, 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(r)), float) * 255
    return np.sqrt(np.maximum(0, m2 - m * m))


def components(mask):
    """Étiquette les zones connexes d'un masque (remplissage successif, sans dépendance externe)."""
    h, w = mask.shape
    img = Image.fromarray(np.where(mask, 255, 0).astype(np.uint8))
    out = []
    ys, xs = np.where(mask)
    seen = np.zeros_like(mask)
    for y, x in zip(ys[::7], xs[::7]):
        if seen[y, x]:
            continue
        im2 = img.copy()
        ImageDraw.floodfill(im2, (int(x), int(y)), 128, thresh=0)
        comp = np.asarray(im2) == 128
        seen |= comp
        out.append(comp)
    return out


def cutout(src, height=420, holes=False, glow=False, strict=False):
    a = np.asarray(Image.open(src).convert('RGB'), float)
    bg = fit_background(a)
    diff = np.abs(a - bg).max(-1)
    lum, bl = a.mean(-1), bg.mean(-1)
    ratio = lum / np.maximum(1, bl)
    chroma = a.max(-1) - a.min(-1)
    smooth = local_std(lum) < 4.5
    near = diff < 9
    shadowish = (chroma < 14) & (ratio > 0.55) & (ratio < 0.995) & smooth
    region = flood(near | shadowish)          # fond + ombre reliés au bord
    # 2e passe : le halo clair resté au pied de l'objet (proche du fond, sans couleur) rejoint le fond
    bglike = (diff < 42) & (chroma < 16) & (ratio > 0.78) if strict else (diff < 30) & (chroma < 14) & (ratio > 0.82)
    if glow:  # halo lumineux teinté autour de l'objet (obélisque)
        bglike |= (ratio > 0.86) & (diff < 70)
    region = flood(region | bglike)
    if holes:  # trous fermés où l'on voit le fond (roue dentée) : grandes zones unies proches du fond
        for comp in components(~region & (chroma < 14) & (ratio > 0.62)):
            if comp.sum() > 120:
                region |= comp
    bgzone = region & near
    shadow = region & ~near
    obj = ~region
    # objet : masque adouci d'un pixel
    oa = np.asarray(Image.fromarray((obj * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8)), float) / 255
    oa = np.where(obj, np.maximum(oa, 0.0), oa)
    # ombre : noire, opacité selon l'assombrissement
    # l'ombre ne compte que près de l'objet (pas le vignettage des coins de la photo)
    small = Image.fromarray((obj * 255).astype(np.uint8)).resize((a.shape[1] // 8, a.shape[0] // 8))
    nearobj = np.asarray(small.filter(ImageFilter.MaxFilter(11)).resize((a.shape[1], a.shape[0]))) > 0
    sa = np.where((shadow | bgzone) & nearobj, np.clip((1 - ratio - 0.04) * 1.8, 0, 0.8), 0)
    sa = np.asarray(Image.fromarray((sa * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5)), float) / 255
    alpha = np.clip(np.maximum(oa, sa * (1 - oa)), 0, 1)
    # couleur : l'objet, débarrassé du fond sur les bords ; l'ombre en noir violacé
    with np.errstate(divide='ignore', invalid='ignore'):
        dec = (a - (1 - oa[..., None]) * bg) / np.maximum(oa[..., None], 0.35)
    col = np.where(oa[..., None] > 0.02, np.clip(dec, 0, 255), np.array([18, 14, 22], float))
    rgba = np.dstack([col, alpha * 255]).astype(np.uint8)
    im = Image.fromarray(rgba, 'RGBA')
    ys, xs = np.where(alpha > 0.03)
    pad = 4
    box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.width, xs.max() + pad + 1), min(im.height, ys.max() + pad + 1))
    im = im.crop(box)
    if im.height > height:
        im = im.resize((round(im.width * height / im.height), height), Image.LANCZOS)
    return im


if __name__ == '__main__':
    args = [x for x in sys.argv[1:] if not x.startswith('--')]
    src, dst = args[0], args[1]
    h = int(args[2]) if len(args) > 2 else 420
    im = cutout(src, h, holes='--holes' in sys.argv, glow='--glow' in sys.argv, strict='--strict' in sys.argv)
    sq = next((int(x.split('=')[1]) for x in sys.argv if x.startswith('--square=')), 0)
    if sq:  # icône : centrée dans un carré transparent
        side = max(im.size)
        canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        canvas.paste(im, ((side - im.width) // 2, (side - im.height) // 2), im)
        im = canvas.resize((sq, sq), Image.LANCZOS)
    im.save(dst, 'WEBP', quality=82, method=6)
    print(dst)
