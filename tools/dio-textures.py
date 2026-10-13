#!/usr/bin/env python3
"""Textures du décor de combat (assets/dio) : sols, murs et masques de lueur.

Toutes les textures se répètent sans couture (calculées sur un tore : bruit par FFT,
diagrammes de Voronoï à distances « enroulées »). Les sols et murs sont gris neutres :
le CSS les teinte selon le royaume (background-blend-mode). Les masques (joints, fissures,
mousse, givre) sont des alphas blancs : le CSS les colore avec mask-image.

Usage : python3 tools/dio-textures.py   (réécrit assets/dio/*.webp, résultat identique à chaque fois)
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

N = 512
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'dio')
os.makedirs(OUT, exist_ok=True)


def smooth_noise(n, sigma, seed):
    """Bruit lisse périodique dans [0, 1] (flou gaussien du bruit blanc, fait dans le domaine de Fourier)."""
    r = np.random.default_rng(seed).standard_normal((n, n))
    ky = np.fft.fftfreq(n)[:, None]
    kx = np.fft.fftfreq(n)[None, :]
    g = np.exp(-((kx ** 2 + ky ** 2) * (2 * np.pi * sigma) ** 2) / 2)
    out = np.real(np.fft.ifft2(np.fft.fft2(r) * g))
    return (out - out.min()) / (out.max() - out.min() + 1e-9)


def fbm(n, seed, octaves=((40, .45), (16, .28), (6, .17), (2, .1))):
    s = sum(w * smooth_noise(n, sig, seed + i * 17) for i, (sig, w) in enumerate(octaves))
    return (s - s.min()) / (s.max() - s.min() + 1e-9)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def voronoi(n, pts, warp=None):
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    if warp is not None:
        xx = xx + warp[0]
        yy = yy + warp[1]
    d1 = np.full((n, n), 1e9, np.float32)
    d2 = np.full((n, n), 1e9, np.float32)
    idx = np.zeros((n, n), np.int32)
    for i, (px, py) in enumerate(pts):
        dx = np.abs(xx - px) % n
        dx = np.minimum(dx, n - dx)
        dy = np.abs(yy - py) % n
        dy = np.minimum(dy, n - dy)
        d = np.sqrt(dx * dx + dy * dy)
        m = d < d1
        d2 = np.where(m, d1, np.minimum(d2, d))
        idx = np.where(m, i, idx)
        d1 = np.where(m, d, d1)
    return d1, d2, idx


def jitter_grid(n, cols, rows, jit, seed):
    rng = np.random.default_rng(seed)
    pts = []
    for j in range(rows):
        for i in range(cols):
            x = (i + 0.5 + (rng.random() - 0.5) * jit) * n / cols
            y = (j + 0.5 + (rng.random() - 0.5) * jit) * n / rows
            pts.append((x % n, y % n))
    return pts


def shade(h, strength=3.0, light=(-0.55, -0.7, 0.75)):
    """Éclairage d'une carte de hauteur (gradient périodique) : lumière venant d'en haut à gauche."""
    gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5 * strength
    gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5 * strength
    nz = 1.0 / np.sqrt(gx * gx + gy * gy + 1)
    nx, ny = -gx * nz, -gy * nz
    lx, ly, lz = light
    ln = np.sqrt(lx * lx + ly * ly + lz * lz)
    lam = (nx * lx + ny * ly + nz * lz) / ln
    return np.clip(lam, 0, 1)


def to_img(rgb, path, q=82):
    a = np.clip(rgb, 0, 1) ** (1 / 1.12)
    Image.fromarray((a * 255).astype(np.uint8), 'RGB').save(path, quality=q, method=6)


def to_mask(alpha, path, q=80):
    a = (np.clip(alpha, 0, 1) * 255).astype(np.uint8)
    im = Image.new('RGBA', (alpha.shape[1], alpha.shape[0]), (255, 255, 255, 0))
    im.putalpha(Image.fromarray(a, 'L'))
    im.save(path, quality=q, method=6)


def tiled_draw(n, draw_fn, blur=0):
    """Dessin sur une toile 3×3 recadrée au centre : les traits qui débordent reviennent de l'autre côté."""
    big = Image.new('L', (n * 3, n * 3), 0)
    d = ImageDraw.Draw(big)
    draw_fn(d, n)
    if blur:
        big = big.filter(ImageFilter.GaussianBlur(blur))
    a = np.asarray(big, np.float32) / 255
    # repli des 9 cases sur la case centrale
    out = np.zeros((n, n), np.float32)
    for j in range(3):
        for i in range(3):
            out = np.maximum(out, a[j * n:(j + 1) * n, i * n:(i + 1) * n])
    return out


def crack_paths(d, n, rng, count, length=(40, 130), width=1):
    for _ in range(count):
        x, y = rng.random() * n + n, rng.random() * n + n
        ang = rng.random() * np.pi * 2
        L = rng.integers(*length)
        pts = [(x, y)]
        for _ in range(int(L / 4)):
            ang += (rng.random() - 0.5) * 0.9
            x += np.cos(ang) * 4
            y += np.sin(ang) * 4
            pts.append((x, y))
            if rng.random() < 0.04:  # petite branche
                a2 = ang + (rng.random() - 0.5) * 2
                bx, by = x, y
                br = [(bx, by)]
                for _ in range(rng.integers(3, 8)):
                    a2 += (rng.random() - 0.5) * 0.8
                    bx += np.cos(a2) * 4
                    by += np.sin(a2) * 4
                    br.append((bx, by))
                d.line(br, fill=200, width=max(1, width - 1))
        d.line(pts, fill=255, width=width)


# ——— Sol : dalles irrégulières ———
def floor_stone():
    rng = np.random.default_rng(7)
    warp = ((smooth_noise(N, 22, 1) - .5) * 26, (smooth_noise(N, 22, 2) - .5) * 26)
    pts = jitter_grid(N, 5, 4, 0.95, 11)
    d1, d2, idx = voronoi(N, pts, warp)
    edge = (d2 - d1) * 0.5
    grout = 1.2 + smooth_noise(N, 10, 3) * 1.5
    k = len(pts)
    base_h = rng.uniform(0.82, 1.0, k)[idx]
    bev = smoothstep(0, 7 + smooth_noise(N, 12, 5) * 6, edge - grout)
    pits = smoothstep(0.7, 0.86, smooth_noise(N, 2.2, 23)) * 0.05  # petites piqûres de la pierre usée
    surf = fbm(N, 21) * 0.13 + smooth_noise(N, 1.2, 22) * 0.03 - pits
    cracks = tiled_draw(N, lambda d, n: crack_paths(d, n, rng, 9), blur=0.6)
    h = base_h * (0.35 + 0.65 * bev) + surf - cracks * 0.06
    h = np.where(edge < grout, 0.0, h)
    lam = shade(h * 22, 1.0)
    alb_stone = rng.uniform(0.7, 1.12, k)[idx] * (0.78 + 0.36 * fbm(N, 31)) * (1 - 0.25 * smooth_noise(N, 3, 32) ** 3) * (1 - pits * 2.5)
    alb = np.where(edge < grout, 0.16, alb_stone * 0.66)
    ao = 0.5 + 0.5 * smoothstep(0, 14, edge)
    v = alb * (0.42 + 0.78 * lam) * ao * (1 - cracks * 0.35)
    rgb = np.dstack([v * 1.0, v * 0.97, v * 0.92])
    to_img(rgb, os.path.join(OUT, 'floor-stone.webp'))
    # joints (pour la lave, les lueurs) : les joints, plus quelques fissures
    joints = np.clip(1 - smoothstep(grout - 0.5, grout + 2.5, edge), 0, 1)
    flick = smoothstep(0.25, 0.75, smooth_noise(N, 30, 41))  # tous les joints ne brillent pas autant
    to_mask(np.clip(joints * (0.35 + 0.65 * flick) + cracks * 0.8, 0, 1), os.path.join(OUT, 'joints.webp'))
    # mousse : taches qui suivent les joints
    moss = smoothstep(0.52, 0.72, fbm(N, 51) * 0.7 + (1 - smoothstep(0, 18, edge)) * 0.45)
    moss *= 0.55 + 0.45 * smooth_noise(N, 1.5, 52)
    to_mask(moss, os.path.join(OUT, 'moss.webp'))
    # givre : voile cristallin, plus dense dans les joints
    fr = smoothstep(0.45, 0.85, fbm(N, 61, ((30, .4), (8, .3), (2, .3))))
    fr = np.clip(fr * 0.75 + (1 - smoothstep(0, 10, edge)) * 0.5, 0, 1) * (0.6 + 0.4 * smooth_noise(N, 0.8, 62))
    to_mask(fr, os.path.join(OUT, 'frost.webp'))
    # fissures seules (fissures lumineuses, éclats de corruption)
    big = tiled_draw(N, lambda d, n: crack_paths(d, n, np.random.default_rng(71), 7, (90, 220), 2), blur=1.2)
    to_mask(np.clip(big * 1.4, 0, 1), os.path.join(OUT, 'cracks.webp'))


# ——— Sol : marbre en grandes dalles carrées ———
def floor_marble():
    t = 128
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    cx, cy = xx % t, yy % t
    edge = np.minimum(np.minimum(cx, t - cx), np.minimum(cy, t - cy))
    grout = 1.6
    tile_id = (yy // t).astype(int) * (N // t) + (xx // t).astype(int)
    rng = np.random.default_rng(5)
    turb = fbm(N, 81, ((24, .5), (8, .3), (3, .2)))
    veins = np.abs(np.sin((xx * 0.9 + yy * 0.45) / N * np.pi * 2 * 2 + turb * 9))
    veins = 1 - smoothstep(0.0, 0.12, veins)
    v2 = 1 - smoothstep(0.0, 0.05, np.abs(np.sin((xx * 0.3 - yy) / N * np.pi * 2 * 3 + fbm(N, 82) * 11)))
    alb = 0.86 * rng.uniform(0.94, 1.04, (N // t) ** 2)[tile_id] - veins * 0.22 - v2 * 0.12 + (turb - 0.5) * 0.08
    h = smoothstep(0, 6, edge - grout) * 0.9
    lam = shade(h * 10, 1.0)
    alb = np.where(edge < grout, 0.3, alb)
    v = alb * (0.55 + 0.55 * lam)
    rgb = np.dstack([v * 0.99, v * 0.98, v * 1.0])
    to_img(rgb, os.path.join(OUT, 'floor-marble.webp'))


# ——— Sol : plaques de métal rivetées ———
def floor_metal():
    t = 128
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    cx, cy = xx % t, yy % t
    edge = np.minimum(np.minimum(cx, t - cx), np.minimum(cy, t - cy))
    tile_id = (yy // t).astype(int) * (N // t) + (xx // t).astype(int)
    rng = np.random.default_rng(9)
    h = smoothstep(0, 5, edge - 1.5) * 0.8
    # rivets aux coins
    for ox in (10, t - 10):
        for oy in (10, t - 10):
            d = np.sqrt((cx - ox) ** 2 + (cy - oy) ** 2)
            h = h + np.clip(1 - d / 4.5, 0, 1) ** 0.6 * 0.6
    # rainures et rayures
    scratches = tiled_draw(N, lambda d, n: [d.line([(rng.random() * n + n, rng.random() * n + n), (rng.random() * n + n, rng.random() * n + n)], fill=int(60 + rng.random() * 90), width=1) for _ in range(70)], blur=0.3)
    lam = shade(h * 12, 1.0)
    alb = 0.62 * rng.uniform(0.9, 1.08, (N // t) ** 2)[tile_id] * (0.86 + 0.24 * fbm(N, 91)) - scratches * 0.12
    alb = np.where(edge < 1.5, 0.12, alb)
    brushed = smooth_noise(N, 0.7, 92)
    v = alb * (0.45 + 0.8 * lam) + (brushed - 0.5) * 0.04
    rgb = np.dstack([v * 0.95, v * 0.98, v * 1.02])
    to_img(rgb, os.path.join(OUT, 'floor-metal.webp'))


# ——— Mur : appareil de pierres en assises ———
def wall_stone():
    rng = np.random.default_rng(13)
    rows = 6
    rh = N / rows
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    row = (yy // rh).astype(int)
    edge = np.zeros((N, N), np.float32)
    bid = np.zeros((N, N), np.int32)
    k = 0
    for r in range(rows):
        widths = []
        total = 0
        while total < N:
            w = rng.integers(96, 230)
            widths.append(w)
            total += w
        widths[-1] -= total - N  # ferme la rangée exactement (la texture se répète)
        off = rng.integers(0, N)
        xs = np.cumsum([0] + widths)
        m = row == r
        lx = (xx[m] + off) % N
        b = np.searchsorted(xs, lx, side='right') - 1
        x0, x1 = xs[b], xs[b + 1]
        y0 = r * rh
        ly = yy[m] - y0
        e = np.minimum(np.minimum(lx - x0, x1 - lx), np.minimum(ly, rh - ly))
        edge[m] = e
        bid[m] = b + k
        k += len(widths)
    warp = (smooth_noise(N, 6, 14) - 0.5) * 6 + (smooth_noise(N, 1.5, 17) - 0.5) * 2
    edge = edge + warp
    grout = 1.6
    base_h = rng.uniform(0.8, 1.0, k + 1)[bid]
    bev = smoothstep(0, 8, edge - grout)
    surf = fbm(N, 15) * 0.16 - smoothstep(0.7, 0.86, smooth_noise(N, 2.5, 18)) * 0.06
    h = np.where(edge < grout, 0.0, base_h * (0.4 + 0.6 * bev) + surf)
    lam = shade(h * 20, 1.0)
    alb = np.where(edge < grout, 0.15, rng.uniform(0.72, 1.12, k + 1)[bid] * 0.62 * (0.78 + 0.36 * fbm(N, 16)))
    ao = 0.55 + 0.45 * smoothstep(0, 10, edge)
    v = alb * (0.42 + 0.78 * lam) * ao
    rgb = np.dstack([v * 1.0, v * 0.97, v * 0.93])
    to_img(rgb, os.path.join(OUT, 'wall-stone.webp'))


# ——— Masques à grande échelle : crasse (casse la répétition des dalles) et flaques ———
def grime_puddles():
    g = fbm(N, 101, ((90, .55), (30, .3), (8, .15)))
    to_mask(smoothstep(0.45, 0.85, g) * 0.9, os.path.join(OUT, 'grime.webp'))
    p = fbm(N, 111, ((60, .6), (20, .3), (5, .1)))
    pud = smoothstep(0.66, 0.74, p)
    to_mask(pud, os.path.join(OUT, 'puddle.webp'))


if __name__ == '__main__':
    grime_puddles()
    floor_stone()
    floor_marble()
    floor_metal()
    wall_stone()
    for f in sorted(os.listdir(OUT)):
        print(f, os.path.getsize(os.path.join(OUT, f)) // 1024, 'Ko')
