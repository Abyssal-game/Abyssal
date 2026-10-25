# v759 : portraits ronds des réactions des gardiens, tirés de leur affiche de présentation
# (store/bosses/scene-<clé>-source.jpg, 572 x 1024 ; la retouche du Bourreau est déjà dans sa source).
# P[clé] = (centre x, centre y, côté) en fraction de la largeur / hauteur / largeur de l'affiche.
# Usage : python3 tools/emote-boss.py write  (refait assets/emotes/gs-<clé>.webp)
#         python3 tools/emote-boss.py sheet  (planche de contrôle /tmp/apres.png)
import sys, json
from PIL import Image, ImageDraw, ImageEnhance
P = {
 'devoreur': (.5, .285, .5), 'matriarche': (.5, .205, .4), 'roi': (.5, .16, .36), 'architecte': (.5, .225, .34),
 'eclipse': (.5, .19, .38), 'essaim': (.50, .25, .32), 'bourreau': (.47, .24, .38), 'choeur': (.50, .19, .46),
 'chaines': (.47, .21, .40), 'horloge': (.50, .24, .32), 'miroirs': (.5, .255, .36), 'golem': (.47, .27, .46),
 'peste': (.5, .165, .34), 'chasseur': (.5, .175, .36), 'voeux': (.5, .175, .36), 'titan': (.42, .28, .46),
 'jumeaux': (.42, .27, .40), 'juge': (.50, .28, .32), 'bete': (.5, .3, .54), 'abysse': (.50, .24, .50),
}
if len(sys.argv) > 2: P.update({k: tuple(v) for k, v in json.loads(sys.argv[2]).items()})
def face(k, out=None):
  src = Image.open(f'store/bosses/scene-{k}-source.jpg').convert('RGB')
  W, H = src.size; cx, cy, s = P[k]; r = s * W / 2; x, y = cx * W, cy * H
  im = src.crop((round(x - r), round(y - r), round(x + r), round(y + r))).resize((192, 192), Image.LANCZOS)
  im = ImageEnhance.Sharpness(im).enhance(1.25)
  m = Image.new('L', (768, 768), 0); ImageDraw.Draw(m).ellipse((0, 0, 767, 767), fill=255)
  im = im.convert('RGBA'); im.putalpha(m.resize((192, 192), Image.LANCZOS))
  if out: im.save(out, quality=88)
  return im
if __name__ == '__main__':
  if sys.argv[1] == 'sheet':
    sh = Image.new('RGB', (160 * 7, 180 * 3), (30, 30, 30)); d = ImageDraw.Draw(sh)
    for i, k in enumerate(P):
      im = face(k).resize((150, 150)); sh.paste(im, ((i % 7) * 160 + 5, (i // 7) * 180), im)
      d.text(((i % 7) * 160 + 8, (i // 7) * 180 + 155), k, fill=(255, 255, 255))
    sh.save('/tmp/apres.png')
  else:
    for k in P: face(k, f'assets/emotes/gs-{k}.webp')
