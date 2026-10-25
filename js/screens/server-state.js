// v678 : Mode Créateur → « État du serveur ». Vérifie, sans rien changer, ce qui est installé sur Supabase et dit
// exactement quels fichiers supabase/*.sql coller ou recoller, dans quel ordre. Les fichiers qui se recollent
// par-dessus portent une empreinte (tools/sql-stamp.mjs) que le serveur garde dans la table sql_stamps.
import { openSheet, esc } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import * as cloud from '../cloud/cloud.js';
import { partie } from '../cloud/partie.js';
import { SQL_STAMPS } from '../cloud/sql-stamps.js';

const R = (fn, body = {}) => () => cloud.probe(`/rest/v1/rpc/${fn}`, body);
const T = (q) => () => cloud.probe(`/rest/v1/${q}`);
/* n : numéro du fichier ; what : à quoi il sert ; test : sonde sans effet (absente = on ne sait pas dire s'il est là) */
const FILES = [
  { n: '01', file: '01-comptes.sql', what: 'Comptes, sauvegardes, profils', test: T('profiles?select=id&limit=0') },
  { n: '02', file: '02-badge.sql', what: 'Badge Créateur', test: T('profiles?select=badge&limit=0') },
  { n: '04', file: '04-epreuve.sql', what: 'Scores des Épreuves', test: T('trial_scores?select=*&limit=0') },
  { n: '05', file: '05-tirage.sql', what: 'Tirage des Ombres', test: R('shadow_today') },
  { n: '06', file: '06-signalements.sql', what: 'Signalement des pseudos', test: T('pseudo_reports?select=*&limit=0') },
  { n: '07', file: '07-amis.sql', what: 'Amis et pseudo définitif', test: R('friend_list') },
  { n: '08', file: '08-versus.sql', what: 'Choc des Boosters (et cartes du serveur)', test: R('versus_list') },
  { n: '09', file: '09-multijoueur.sql', what: 'Jeux en ligne', test: R('mp_list', { p_game: 'sceaux' }) },
  { n: '10', file: '10-profils.sql', what: 'Profil de n’importe quel joueur', test: () => R('public_profile', { p_id: cloud.currentUser()?.id })() },
  { n: '11', file: '11-anti-triche.sql', what: 'Contrôles anti-triche (titres, cartes, Épreuves)', test: T('game_titles?select=*&limit=0') },
  { n: '12', file: '12-serveur-de-partie.sql', what: 'Serveur de partie', test: T('parties?select=user_id&limit=0') },
  { n: '13', file: '13-verrouillage.sql', what: 'Verrouillage (seul le serveur écrit les parties)' },
  { n: '14', file: '14-pseudos.sql', what: 'Filtre des pseudos' },
  { n: '15', file: '15-vitrine.sql', what: 'Cadres et plaques vus par les autres' },
  { n: '16', file: '16-en-ligne.sql', what: 'Joueurs en ligne (compte « Le Gardien »)', test: R('online_list') },
  { n: '17', file: '17-notifications.sql', what: 'Notifications envoyées par le serveur', test: R('push_unregister', { p_token: '-' }) }, /* v693 */
];
/* une réponse d'erreur qui prouve que l'objet existe (exception levée, accès refusé) ou qu'il manque */
const present = (r) => r.ok || r.code === 'P0001' || r.code === '42501' || (r.status === 400 && !/^(PGRST20[0-9]|42P01|42883|42703)$/.test(r.code));
const missing = (r) => r.status === 404 || /^(PGRST202|PGRST205|42P01|42883|42703)$/.test(r.code);

const LABEL = { ok: ['À jour', 'ok'], stale: ['À recoller', 'warn'], missing: ['À coller', 'bad'], unknown: ['À vérifier', 'muted'], wait: ['…', 'muted'] };

export async function checkServer() {
  const st = await cloud.probe('/rest/v1/rpc/sql_stamps', {});
  const stamps = st.ok && st.data && typeof st.data === 'object' ? st.data : {};
  const rows = await Promise.all(FILES.map(async (f) => {
    const r = f.test ? await f.test() : null;
    const want = SQL_STAMPS[f.n]?.stamp;
    let state = 'unknown', note = '';
    if (r && r.code === 'net') state = 'unknown', note = r.msg;
    else if (r && missing(r)) state = 'missing';
    else if (want) {
      state = stamps[f.n] === want ? 'ok' : (r && !present(r) ? 'unknown' : 'stale');
      /* v683 : la note n'accompagne qu'une version qui n'est pas celle du jeu (avant, elle s'affichait aussi sous « À jour ») */
      if (state !== 'ok') note = stamps[f.n] ? 'Version plus ancienne que celle du jeu.' : 'Version inconnue (collé avant le marquage).';
    }
    else if (r) state = present(r) ? 'ok' : 'unknown', note = present(r) ? '' : `${r.status} ${r.code} ${r.msg}`.trim();
    return { ...f, state, note };
  }));
  const by = Object.fromEntries(rows.map((x) => [x.n, x]));
  /* 13 ne se teste pas sans écrire : il se juge sur son empreinte, et seulement quand le serveur de partie tourne */
  const lock = by['13'];
  if (!stamps['13']) { lock.state = partie.mode === 'server' ? 'missing' : 'unknown'; lock.note = partie.mode === 'server' ? 'Le serveur de partie tourne : tu peux verrouiller.' : 'À coller seulement quand Réglages → À propos dit « Progression gardée par le serveur ».'; }
  /* recoller 11 ou 12 rend des droits que 13 retire : 13 se recolle après */
  if (stamps['13'] && ['11', '12'].some((n) => by[n].state !== 'ok')) { lock.state = 'stale'; lock.note = 'À recoller après le 11 et le 12.'; }
  /* 06 ne se recolle jamais par-dessus 07 (il remettrait l'ancien contrôle des pseudos) */
  if (by['06'].state === 'missing' && by['07'].state !== 'missing') by['06'].note = 'Inutile : le 07 le remplace.', by['06'].state = 'ok';
  const todo = rows.filter((x) => x.state === 'missing' || x.state === 'stale');
  return { rows, todo, serverMode: partie.mode, stampsOk: st.ok };
}

export function openServerState() {
  const sheet = openSheet('', { full: true, cls: 'srv-state', label: 'État du serveur' });
  const draw = (res) => {
    const rows = res ? res.rows : FILES.map((f) => ({ ...f, state: 'wait', note: '' }));
    const todo = res?.todo || [];
    sheet.setContent(`<div translate="no">
      <h2>${icon('crown')} État du serveur</h2>
      <p class="small muted">Ce qui est installé sur Supabase, vérifié sans rien changer. Mode du jeu : <b>${res ? (res.serverMode === 'server' ? 'progression gardée par le serveur' : res.serverMode === 'legacy' ? 'ancien système (pas de serveur de partie)' : 'pas encore connu') : '…'}</b>.</p>
      ${!cloud.isLoggedIn() ? '<p class="srv-warn">Connecte-toi d’abord à ton compte : la vérification se fait avec lui.</p>' : ''}
      ${res ? (todo.length ? `<section class="srv-todo"><h3>À faire, dans cet ordre</h3><ol>${todo.map((x) => `<li><b>supabase/${esc(x.file)}</b><small>${esc(x.what)}</small></li>`).join('')}</ol>
        <p class="small muted">Pour chaque fichier : Supabase → SQL Editor → New query → colle tout le fichier → Run. Puis reviens ici et touche « Vérifier ».</p></section>`
        : '<section class="srv-todo ok"><h3>Tout est à jour</h3><p class="small muted">Rien à coller.</p></section>') : ''}
      <div class="srv-list">${rows.map((x) => { const [lab, cls] = LABEL[x.state]; return `<div class="srv-row"><span class="srv-n">${x.n}</span><span class="srv-w">${esc(x.what)}${x.note ? `<small>${esc(x.note)}</small>` : ''}</span><span class="srv-chip ${cls}">${lab}</span></div>`; }).join('')}</div>
      <button class="btn block gold" data-srv="again">${icon('refresh')}Vérifier</button></div>`);
  };
  const run = async () => { draw(null); draw(await checkServer()); };
  sheet.body.addEventListener('click', (e) => { if (e.target.closest('[data-srv="again"]')) run(); });
  run();
}
