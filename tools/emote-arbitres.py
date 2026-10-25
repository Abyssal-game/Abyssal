# v764 : portraits Gemini des 8 arbitres et des 4 réactions du Codex (prompts : store/emotes/prompts-arbitres.md).
# Source store/emotes/a-<nom>-source.jpg →
#   arbitres : assets/sceaux/rival2-<clé>.webp (256 px, carré, coins sombres ; jeux et réactions)
#   Codex    : assets/emotes/a-<nom>.webp (192 px, rond)
# P[nom] = (centre x, centre y, côté) en fraction de la source. Usage : python3 tools/emote-arbitres.py write | sheet
import sys
from PIL import Image, ImageDraw
RIVAL = {'ilda': 'initie', 'orvel': 'collectionneur', 'vesna': 'stratege', 'maitre': 'maitre', 'echo': 'echo',
         'mammon': 'banquier', 'archiviste': 'archiviste', 'souveraine': 'souverain'}
CODEX = ['feu-follet', 'passeur', 'blizzard', 'sentinelle']
P = {'ilda': (.5, .40, .78), 'orvel': (.5, .47, .76), 'vesna': (.5, .38, .78), 'maitre': (.5, .5, .84),
     'echo': (.5, .5, .84), 'mammon': (.5, .5, .84), 'archiviste': (.5, .5, .86), 'souveraine': (.5, .47, .84),
     'feu-follet': (.5, .5, .84), 'passeur': (.5, .5, .74), 'blizzard': (.5, .5, .86), 'sentinelle': (.5, .48, .84)}
def face(n, px):
  src = Image.open(f'store/emotes/a-{n}-source.jpg').convert('RGB'); W, H = src.size
  cx, cy, s = P[n]; r = s * min(W, H) / 2; x = min(max(cx * W, r), W - r); y = min(max(cy * H, r), H - r)
  im = src.crop((round(x - r), round(y - r), round(x + r), round(y + r))).resize((px, px), Image.LANCZOS)
  m = Image.new('L', (px * 4, px * 4), 0); ImageDraw.Draw(m).ellipse((0, 0, px * 4 - 1, px * 4 - 1), fill=255)
  return im, m.resize((px, px), Image.LANCZOS)
def out(n):
  if n in RIVAL:
    im, m = face(n, 256); bg = Image.new('RGB', im.size, (10, 9, 14)); bg.paste(im, (0, 0), m); return bg
  im, m = face(n, 192); im = im.convert('RGBA'); im.putalpha(m); return im
if __name__ == '__main__':
  names = list(RIVAL) + CODEX
  if sys.argv[1] == 'sheet':
    sh = Image.new('RGB', (110 * 12, 160), (30, 30, 30))
    for i, n in enumerate(names):
      a = out(n).convert('RGBA'); big = a.resize((100, 100)); sh.paste(big, (i * 110 + 5, 5), big)
      sm = a.resize((44, 44)); sh.paste(sm, (i * 110 + 33, 110), sm)
    sh.save('/tmp/arb.png')
  else:
    for n in names:
      out(n).save(f'assets/sceaux/rival2-{RIVAL[n]}.webp' if n in RIVAL else f'assets/emotes/a-{n}.webp', quality=88)
