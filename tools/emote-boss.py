# v756 : réactions des gardiens. Portrait rond d'un gardien tiré de sa carte de combat (source 765 x 1024).
# Coordonnées données sur la vignette 200 x 280 de la carte (planche cards.png).
# Usage : python3 tools/emote-boss.py write  (refait assets/emotes/gc-<clé>.webp)
#         python3 tools/emote-boss.py sheet  (planche /tmp/apres.png)
import sys, json
from PIL import Image, ImageDraw, ImageFilter
P = {
 'devoreur':(100,86,100),'matriarche':(100,70,80),'roi':(100,58,72),'architecte':(100,50,68),
 'eclipse':(100,68,72),'essaim':(100,72,66),'bourreau':(100,80,66),'choeur':(100,66,84),
 'chaines':(95,80,78),'horloge':(100,64,62),'miroirs':(105,74,66),'golem':(100,86,80),
 'peste':(100,62,68),'chasseur':(95,74,72),'voeux':(95,52,62),'titan':(110,54,78),
 'jumeaux':(96,90,66),'juge':(103,94,64),'bete':(100,52,110),'abysse':(100,70,118),
}
if len(sys.argv) > 2: P.update(json.loads(sys.argv[2]))
K = 1024 / 280; X0 = (765 - 1024 * 5 / 7) / 2
def face(k, out):
  cx, cy, s = P[k]
  src = Image.open(f'store/bosses/combat-{k}-source.jpg').convert('RGB')
  x, y, r = X0 + cx * K, cy * K, s * K / 2
  im = src.crop((round(x - r), round(y - r), round(x + r), round(y + r))).resize((192, 192), Image.LANCZOS)
  m = Image.new('L', (768, 768), 0); ImageDraw.Draw(m).ellipse((0, 0, 767, 767), fill=255)
  m = m.resize((192, 192), Image.LANCZOS)
  im = im.convert('RGBA'); im.putalpha(m); im.save(out, quality=86)
  return im
if __name__ == '__main__':
  mode = sys.argv[1]
  ks = list(P)
  if mode == 'sheet':
    sh = Image.new('RGB', (160 * 7, 180 * 3), (30, 30, 30)); d = ImageDraw.Draw(sh)
    for i, k in enumerate(ks):
      im = face(k, f'/tmp/{k}.webp').resize((150, 150))
      sh.paste(im, ((i % 7) * 160 + 5, (i // 7) * 180), im); d.text(((i % 7) * 160 + 8, (i // 7) * 180 + 155), k, fill=(255, 255, 255))
    sh.save('/tmp/apres.png')
  else:
    for k in ks: face(k, f'assets/emotes/gc-{k}.webp')
