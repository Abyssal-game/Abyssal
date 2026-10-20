# Usage : python3 tools/jeux-art.py   (v464 : images Gemini des Cryptes, du Pacte et des Enchères)
# Sources dans store/jeux/*-source.jpg ; sorties dans assets/jeux/. Refait tout à chaque appel.
import os, random, subprocess, sys
import numpy as np
from PIL import Image

S, O = 'store/jeux', 'assets/jeux'
os.makedirs(O, exist_ok=True)
src = lambda n: Image.open(f'{S}/{n}-source.jpg').convert('RGB')
def save(im, name, q=82):
    im.save(f'{O}/{name}.webp', quality=q, method=6)
    print(name, im.size)
def card(im, name, w=300):  # carte 5:7
    im.resize((w, w * 7 // 5), Image.LANCZOS).save(f'{O}/{name}.webp', quality=82, method=6); print(name)
def on_black(im):  # fond noir → transparent (alpha = canal le plus clair, couleur dé-mélangée du noir)
    a = np.asarray(im, float)
    al = a.max(-1) / 255
    al = np.clip((al - .06) / .94, 0, 1)
    rgb = np.clip(a / np.maximum(al[..., None], 1e-3), 0, 255)
    return Image.fromarray(np.dstack([rgb, al * 255]).astype(np.uint8), 'RGBA')

# ——— Cryptes ———
# Plateau : cadre de runes et coins gardés ; l'intérieur (niches 4 × 4) remplacé par la bande de pierre du milieu,
# répétée en colonnes décalées (dalles). Lu en border-image (tranches 94 66 98 70).
random.seed(7)
im = src('cryptes-plateau')
strip = im.crop((263, 240, 309, 790))
X0, X1, Y0, Y1 = 100, 476, 234, 792
x = X0
while x < X1:
    off = random.randint(0, 270)
    col = Image.new('RGB', (46, Y1 - Y0))
    col.paste(strip.crop((0, off, 46, 550)), (0, 0)); col.paste(strip, (0, 550 - off))
    if random.random() < .5: col = col.transpose(Image.FLIP_LEFT_RIGHT)
    im.paste(col.crop((0, 0, min(46, X1 - x), Y1 - Y0)), (x, Y0)); x += 46
save(im.crop((30, 140, 542, 890)), 'cr-plateau')
card(src('cryptes-dos'), 'cr-dos', 240)
# Lueur d'une paire : trait du cadre à x 290-733, y 174-841 ; marge de 100 px gardée autour (inset -22,6 % / -15 % en CSS)
save(on_black(src('cryptes-paire').crop((190, 74, 833, 941))).resize((322, 434), Image.LANCZOS), 'cr-paire')

# ——— Pacte ———
# Table : le parchemin autour du cadre rouge (rangée de cartes) et des sept sceaux de cire
def blank_seals(im):  # v511 : gravure des sept sceaux effacée (étoiles à six branches) ; l'emblème de la faction est posé par le jeu
    from PIL import ImageFilter
    import math
    out = im.copy()
    for (x, y) in [(47, 170), (100, 207), (160, 233), (225, 245), (292, 235), (353, 207), (405, 170)]:
        R = 26; box = (x - R, y - R, x + R, y + R); patch = im.crop(box)
        sm = patch.filter(ImageFilter.MedianFilter(7)).filter(ImageFilter.GaussianBlur(5))
        m = Image.new('L', patch.size, 0); px = m.load()
        for j in range(patch.size[1]):
            for i in range(patch.size[0]):
                d = math.hypot(i - R, j - R); px[i, j] = int(255 * (1.0 if d <= 15 else max(0.0, 1 - (d - 15) / 5)))
        out.paste(Image.composite(sm, patch, m), box[:2])
    return out
save(blank_seals(src('pacte-table').crop((60, 395, 510, 725))), 'pa-table2', 88)
s = src('pacte-sceau'); w = 1024 * 5 // 7; card(s.crop(((s.width - w) // 2, 0, (s.width - w) // 2 + w, 1024)), 'pa-sceau')
card(src('pacte-gardien'), 'pa-gardien')
# Offrande (9:16) : une bande retirée là où les deux bords se raccordent le mieux, pour du 5:7
o = src('pacte-offrande'); a = np.asarray(o, float); cut = 1024 - 572 * 7 // 5
y1 = min(range(120, 1024 - cut - 60), key=lambda y: np.abs(a[y] - a[y + cut]).mean() + np.abs(a[y - 1] - a[y + cut - 1]).mean())
o2 = Image.new('RGB', (572, 1024 - cut)); o2.paste(o.crop((0, 0, 572, y1)), (0, 0)); o2.paste(o.crop((0, y1 + cut, 572, 1024)), (0, y1))
card(o2, 'pa-offrande')
save(on_black(src('pacte-brisure').crop((112, 112, 912, 912))).resize((480, 480), Image.LANCZOS), 'pa-brisure')

# ——— Enchères ———
# Scène : la salle autour du pupitre (coussin du lot au centre, deux fauteuils)
save(src('encheres-salle').crop((0, 300, 572, 790)), 'en-salle', 84)
card(src('encheres-malediction'), 'en-malediction')
for n, out in (('encheres-jeton', 'en-jeton'), ('encheres-marteau', 'en-marteau')):
    subprocess.run([sys.executable, 'tools/cutout-white.py', f'{S}/{n}-source.jpg', f'{O}/{out}.webp', '--soft'], check=True)
j = Image.open(f'{O}/en-jeton.webp'); j.resize((128, round(128 * j.height / j.width)), Image.LANCZOS).save(f'{O}/en-jeton.webp', quality=86, method=6)
m = Image.open(f'{O}/en-marteau.webp'); m.resize((360, round(360 * m.height / m.width)), Image.LANCZOS).save(f'{O}/en-marteau.webp', quality=86, method=6)
print('ok')
