# v760 : portraits ronds des réactions des gardiens, peints par Gemini (prompts : store/emotes/prompts-gardiens.md).
# Source carrée store/emotes/g-<clé>-source.jpg → assets/emotes/gp-<clé>.webp (192 px, masque rond).
# P[clé] = (centre x, centre y, côté) en fraction de la source ; sans entrée : centre, 84 %.
# Usage : python3 tools/emote-gemini.py write | sheet [json]
import sys, os, json
from PIL import Image, ImageDraw
P = {
 'devoreur': (.5, .44, .86), 'matriarche': (.5, .42, .84), 'roi': (.48, .40, .84), 'architecte': (.5, .44, .80),
 'eclipse': (.5, .44, .84), 'essaim': (.5, .38, .80), 'bourreau': (.5, .46, .90), 'choeur': (.5, .42, .84),
 'chaines': (.5, .40, .84), 'horloge': (.5, .38, .80),
 'miroirs': (.48, .42, .80), 'peste': (.5, .42, .82), 'chasseur': (.5, .44, .80), 'voeux': (.5, .55, .80),
 'golem': (.5, .48, .86), 'titan': (.5, .42, .84), 'jumeaux': (.5, .5, .88), 'juge': (.5, .42, .84), 'bete': (.5, .42, .86), 'abysse': (.5, .40, .84),
}
if len(sys.argv) > 2: P.update({k: tuple(v) for k, v in json.loads(sys.argv[2]).items()})
KEYS = [k for k in ['devoreur', 'matriarche', 'roi', 'architecte', 'eclipse', 'essaim', 'bourreau', 'choeur', 'chaines', 'horloge', 'miroirs', 'golem', 'peste', 'chasseur', 'voeux', 'titan', 'jumeaux', 'juge', 'bete', 'abysse'] if os.path.exists(f'store/emotes/g-{k}-source.jpg')]
def face(k, out=None):
  src = Image.open(f'store/emotes/g-{k}-source.jpg').convert('RGB'); W, H = src.size
  cx, cy, s = P.get(k, (.5, .5, .84)); r = s * min(W, H) / 2; x, y = cx * W, cy * H
  x = min(max(x, r), W - r); y = min(max(y, r), H - r)
  im = src.crop((round(x - r), round(y - r), round(x + r), round(y + r))).resize((192, 192), Image.LANCZOS)
  m = Image.new('L', (768, 768), 0); ImageDraw.Draw(m).ellipse((0, 0, 767, 767), fill=255)
  im = im.convert('RGBA'); im.putalpha(m.resize((192, 192), Image.LANCZOS))
  if out: im.save(out, quality=88)
  return im
if __name__ == '__main__':
  if sys.argv[1] == 'sheet':
    sh = Image.new('RGB', (110 * 10, 260), (30, 30, 30)); d = ImageDraw.Draw(sh)
    for i, k in enumerate(KEYS):
      a = face(k); x = (i % 10) * 110 + 5; y = (i // 10) * 130
      big = a.resize((100, 100)); sh.paste(big, (x, y), big)
      sm = a.resize((44, 44)); sh.paste(sm, (x + 28, y + 102), sm)
    sh.save('/tmp/apres.png')
  else:
    for k in KEYS: face(k, f'assets/emotes/gp-{k}.webp')
