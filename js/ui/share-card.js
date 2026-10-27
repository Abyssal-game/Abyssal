// v856 : partager une carte en image (fiche de carte → « Partager »).
// L'image (1080 × 1350, format des réseaux) est dessinée dans un canvas : logo, illustration encadrée à la couleur
// de la rareté, reflet de la finition, nom, rareté, faction et adresse du jeu. Dans l'app : menu Partager du téléphone ;
// sur le web : partage du navigateur, sinon téléchargement.
import { RARITY, VARIANTS } from '../config.js';
import { artUrl } from '../art/assets.js';
import { isNative } from '../native.js';
import { t, tw } from '../i18n.js';

const W = 1080, H = 1350;
const SHEEN = {
  holo: ['rgba(230,240,255,0)', 'rgba(230,240,255,.55)', 'rgba(180,200,230,0)'],
  gold: ['rgba(255,214,120,0)', 'rgba(255,214,120,.6)', 'rgba(255,170,60,0)'],
  galaxy: ['rgba(120,80,255,0)', 'rgba(150,110,255,.6)', 'rgba(60,150,255,0)'],
  crystal: ['rgba(140,230,255,0)', 'rgba(190,245,255,.6)', 'rgba(120,200,255,0)'],
  prism: ['rgba(255,80,120,.0)', 'rgba(255,200,80,.45)', 'rgba(80,220,255,.45)', 'rgba(190,110,255,0)'],
};

const load = (src) => new Promise((ok, ko) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ko(new Error(src)); im.src = src; });
const font = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || 'serif';

function rounded(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function fitText(c, text, max, size, family, weight = 700) {
  let s = size;
  do { c.font = `${weight} ${s}px ${family}`; s -= 2; } while (c.measureText(text).width > max && s > 24);
}

export async function cardImage(cat, card, variant = 'normal') {
  const fac = cat.faction[card.faction], rar = RARITY[card.rarity];
  const fc = fac?.colors?.secondary || '#C9A45A', rc = rar?.color || '#C9A45A';
  const disp = font('--f-display'), ui = font('--f-ui');
  try { await document.fonts?.ready; } catch (e) { /* polices déjà là */ }
  const [art, logo] = await Promise.all([load(artUrl(card)), load('assets/brand/title.webp').catch(() => null)]);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  // fond : nuit de l'Abysse teintée de la faction
  c.fillStyle = '#07080C'; c.fillRect(0, 0, W, H);
  const bg = c.createRadialGradient(W / 2, 640, 60, W / 2, 640, 820);
  bg.addColorStop(0, `${fc}66`); bg.addColorStop(0.55, `${fc}1A`); bg.addColorStop(1, 'rgba(7,8,12,0)');
  c.fillStyle = bg; c.fillRect(0, 0, W, H);
  // logo
  if (logo) { const k = Math.min(500 / logo.width, 140 / logo.height), lw = logo.width * k, lh = logo.height * k; c.drawImage(logo, (W - lw) / 2, 22 + (140 - lh) / 2, lw, lh); } /* proportions gardées, au-dessus de la carte */
  // carte : cadre doré, lueur de la rareté, illustration
  const cw = 600, ch = 840, cx = (W - cw) / 2, cy = 200;
  c.save(); c.shadowColor = rc; c.shadowBlur = 60;
  rounded(c, cx - 14, cy - 14, cw + 28, ch + 28, 30); c.fillStyle = '#120C06'; c.fill(); c.restore();
  const gold = c.createLinearGradient(cx, cy, cx + cw, cy + ch);
  gold.addColorStop(0, '#F6E2A8'); gold.addColorStop(0.35, '#B8893A'); gold.addColorStop(0.65, '#F2D9A0'); gold.addColorStop(1, '#8A6224');
  rounded(c, cx - 12, cy - 12, cw + 24, ch + 24, 28); c.lineWidth = 6; c.strokeStyle = gold; c.stroke();
  rounded(c, cx - 3, cy - 3, cw + 6, ch + 6, 20); c.lineWidth = 3; c.strokeStyle = rc; c.stroke();
  c.save(); rounded(c, cx, cy, cw, ch, 18); c.clip();
  c.drawImage(art, cx, cy, cw, ch);
  // reflet de la finition
  const sh = SHEEN[variant];
  if (sh) {
    const g = c.createLinearGradient(cx, cy, cx + cw, cy + ch);
    sh.forEach((col, i) => g.addColorStop(0.15 + (0.7 * i) / (sh.length - 1), col));
    c.globalCompositeOperation = 'screen'; c.fillStyle = g; c.fillRect(cx, cy, cw, ch);
    c.globalCompositeOperation = 'source-over';
  }
  c.restore();
  // textes
  c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  const name = tw(card.name);
  fitText(c, name, 960, 66, disp, 700);
  c.shadowColor = 'rgba(0,0,0,.9)'; c.shadowBlur = 12;
  c.fillStyle = '#F2D9A0'; c.fillText(name, W / 2, 1136);
  c.font = `700 40px ${ui}`;
  const line = `${tw(rar?.name || '')}  ·  ${tw(fac?.name || '')}`;
  c.fillStyle = rc; c.fillText(line, W / 2, 1196);
  if (variant && variant !== 'normal' && VARIANTS[variant]) {
    c.font = `italic 600 36px ${ui}`; c.fillStyle = '#E7D8B4';
    c.fillText(t('Finition {f}', { f: tw(VARIANTS[variant].name) }), W / 2, 1250);
  }
  c.shadowBlur = 0;
  c.font = `600 30px ${ui}`; c.fillStyle = 'rgba(231,216,180,.7)';
  c.fillText('abyssal-game.fr', W / 2, 1316);
  return new Promise((ok, ko) => cv.toBlob((b) => (b ? ok(b) : ko(new Error('image'))), 'image/png'));
}

const toB64 = (blob) => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = ko; r.readAsDataURL(blob); });

// Renvoie 'shared', 'saved' (téléchargée) ou 'cancel'
export async function shareCard(cat, card, variant = 'normal') {
  const blob = await cardImage(cat, card, variant);
  const fileName = `abyssal-${card.id}.png`, title = `ABYSSAL · ${tw(card.name)}`;
  const cap = window.Capacitor?.Plugins;
  if (isNative() && cap?.Filesystem && cap?.Share) {
    const { uri } = await cap.Filesystem.writeFile({ path: fileName, data: await toB64(blob), directory: 'CACHE' });
    try { await cap.Share.share({ title, files: [uri] }); return 'shared'; }
    catch (e) { if (/cancel/i.test(String(e?.message || e))) return 'cancel'; throw e; }
  }
  const file = new File([blob], fileName, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return 'shared'; }
    catch (e) { if (e?.name === 'AbortError') return 'cancel'; }
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fileName;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'saved';
}
