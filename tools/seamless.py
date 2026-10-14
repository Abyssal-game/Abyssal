#!/usr/bin/env python3
"""Rend une texture peinte raccordable (bords qui se rejoignent quand on la répète).

Méthode : une copie décalée d'une demi-image (ses bords se raccordent déjà, sa couture est au centre)
recouvre les bords de l'original. La limite entre les deux suit un tracé irrégulier, adouci sur
quelques pixels, pour ne pas laisser de ligne droite visible.

Usage : python3 tools/seamless.py source.jpg sortie.webp [taille=512]
"""
import sys
import numpy as np
from PIL import Image, ImageFilter


def noise(n, scale, seed):
    rng = np.random.default_rng(seed)
    small = rng.random((max(2, n // scale),) * 2)
    img = Image.fromarray((small * 255).astype(np.uint8)).resize((n, n), Image.BICUBIC)
    return np.asarray(img, dtype=float) / 255.0


def seamless(src, size=512, seed=7):
    im = Image.open(src).convert('RGB').resize((size, size), Image.LANCZOS)
    a = np.asarray(im, dtype=float)
    n = size
    b = np.roll(a, (n // 2, n // 2), axis=(0, 1))
    # distance au bord le plus proche (0 au bord, 1 au centre), perturbée par un bruit doux
    y, x = np.mgrid[0:n, 0:n] / (n - 1)
    d = np.minimum(np.minimum(x, 1 - x), np.minimum(y, 1 - y)) * 2
    d = d + (noise(n, 24, seed) - 0.5) * 0.22 + (noise(n, 8, seed + 1) - 0.5) * 0.08
    # 1 = original (centre), 0 = copie décalée (bords) ; transition sur une bande étroite
    w = np.clip((d - 0.30) / 0.10, 0, 1)
    w = np.asarray(Image.fromarray((w * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2)), dtype=float) / 255.0
    w[:, :1] = w[:, -1:] = w[:1, :] = w[-1:, :] = 0  # les bords viennent toujours de la copie raccordée
    out = a * w[..., None] + b * (1 - w[..., None])
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    size = int(sys.argv[3]) if len(sys.argv) > 3 else 512
    seamless(src, size).save(dst, 'WEBP', quality=80, method=6)
    print(dst)
