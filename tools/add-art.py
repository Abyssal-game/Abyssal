"""Ajoute une illustration définitive : recadre au format 5:7, redimensionne en
600 x 840, enregistre en WebP dans assets/art/<ID>.webp et met à jour le manifeste.
Usage : python3 tools/add-art.py <ID> <image> [--alt] [--focus 0.3] [--pad]
(--focus : position verticale du recadrage, 0 = haut, 0.5 = centre ;
 --pad : image entière sur fond noir au lieu de la recadrer, pour les images à cadre intégré)"""
import json, sys, pathlib
from PIL import Image

root = pathlib.Path(__file__).resolve().parent.parent
args = sys.argv[1:]
if len(args) < 2:
    sys.exit(__doc__)
card_id, src = args[0], args[1]
alt = '--alt' in args
focus = float(args[args.index('--focus') + 1]) if '--focus' in args else 0.35
cards = {c['id'] for f in (root / 'data/cards').glob('*.json') for c in json.loads(f.read_text())}
if card_id not in cards:
    sys.exit(f'Carte inconnue : {card_id}')
im = Image.open(src).convert('RGB')
w, h = im.size
target = 5 / 7
if '--pad' in args:
    im.thumbnail((600, 840), Image.LANCZOS)
    bg = Image.new('RGB', (600, 840), im.getpixel((2, h // 2 * im.height // h)))
    bg.paste(im, ((600 - im.width) // 2, (840 - im.height) // 2))
    im = bg
elif w / h > target:
    nw = round(h * target); x = (w - nw) // 2
    im = im.crop((x, 0, x + nw, h))
else:
    nh = round(w / target); y = round((h - nh) * focus)
    im = im.crop((0, y, w, y + nh))
im = im.resize((600, 840), Image.LANCZOS) if im.size != (600, 840) else im
name = f'{card_id}-alt' if alt else card_id
out = root / 'assets/art' / f'{name}.webp'
im.save(out, 'WEBP', quality=84, method=6)
# miniature légère pour les grilles (Collection, équipe, réserve…)
(root / 'assets/art/lite').mkdir(exist_ok=True)
im.resize((330, 462), Image.LANCZOS).save(root / 'assets/art/lite' / f'{name}.webp', 'WEBP', quality=72, method=6)
mf = root / 'assets/art/manifest.json'
data = json.loads(mf.read_text())
if name not in data['available']:
    data['available'].append(name)
    data['available'].sort()
mf.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
print(f'{out.relative_to(root)} ({out.stat().st_size // 1024} Ko) ajouté au manifeste.')
