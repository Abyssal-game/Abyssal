// v917 : Mode Créateur → « Tableau de bord ». Où les joueurs s'arrêtent et combien reviennent, d'après nos propres
// tables (supabase/22-tableau-de-bord.sql, fonction createur_stats, réservée au badge « createur ») : aucun pistage,
// rien de personnel (ni e-mail, ni pseudo), les comptes du créateur ne sont pas comptés.
import { openSheet, esc } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import * as cloud from '../cloud/cloud.js';

const STEPS = {
  compte: 'Compte créé',
  partie: 'Partie lancée',
  booster: 'Premier booster ouvert',
  etage1: 'Premier étage gagné',
  gardien: 'Premier gardien vaincu',
  etage10: 'Étage 10',
  etage25: 'Étage 25',
  etage50: 'Étage 50',
  etage100: 'Étage 100 (L’Abysse)',
};
const pc = (n, d) => (d ? `${Math.round((100 * n) / d)} %` : '—');

export function dashboardHTML(d) {
  const top = d.etapes?.[0]?.n || 0;
  const steps = (d.etapes || []).map((x, i, a) => {
    const prev = i ? a[i - 1].n : x.n, w = top ? Math.max(2, Math.round((100 * x.n) / top)) : 0;
    const lost = i && prev ? prev - x.n : 0;
    return `<div class="db-step"><div class="db-sl"><span>${esc(STEPS[x.k] || x.k)}</span><b>${x.n}</b></div>
      <div class="db-bar"><i style="width:${w}%"></i></div>
      <small>${pc(x.n, top)} des comptes${lost > 0 ? ` · <span class="db-lost">${lost} arrêté${lost > 1 ? 's' : ''} ici (${pc(lost, prev)})</span>` : ''}</small></div>`;
  }).join('');
  const r = d.retour || {};
  const max = Math.max(1, ...(d.jours || []).map((x) => x.n));
  const days = (d.jours || []).map((x) => `<div class="db-day" title="${esc(x.d)} : ${x.n}"><i style="height:${Math.round((100 * x.n) / max)}%"></i><small>${esc(String(x.d).slice(8, 10))}</small></div>`).join('');
  const tel = d.telephones || {};
  return `
    <div class="db-tiles">
      <div class="db-tile"><b>${d.comptes || 0}</b><small>comptes</small></div>
      <div class="db-tile"><b>${d.actifs?.jour || 0}</b><small>actifs aujourd’hui</small></div>
      <div class="db-tile"><b>${d.actifs?.semaine || 0}</b><small>actifs 7 jours</small></div>
      <div class="db-tile"><b>${d.nouveaux?.semaine || 0}</b><small>nouveaux 7 jours</small></div>
    </div>
    <section class="cr-sec"><h3>Nouveaux comptes, 14 derniers jours</h3><div class="db-days">${days}</div></section>
    <section class="cr-sec"><h3>Le parcours des joueurs</h3>${steps}</section>
    <section class="cr-sec"><h3>Ceux qui reviennent</h3>
      <p class="small">Revenus un 2<sup>e</sup> jour : <b>${pc(r.j1 || 0, r.j1_base)}</b> <span class="muted">(${r.j1 || 0} sur ${r.j1_base || 0} comptes de plus de 2 jours)</span></p>
      <p class="small">7 jours de jeu ou plus : <b>${pc(r.j7 || 0, r.j7_base)}</b> <span class="muted">(${r.j7 || 0} sur ${r.j7_base || 0} comptes de plus de 8 jours)</span></p>
      <p class="small">Encore là cette semaine : <b>${pc(r.actif7 || 0, r.actif7_base)}</b> <span class="muted">(${r.actif7 || 0} sur ${r.actif7_base || 0} comptes de plus de 7 jours)</span></p></section>
    <section class="cr-sec"><h3>Le reste</h3>
      <p class="small">Ont joué au Cercle de l’Abysse : <b>${d.jeux?.cercle || 0}</b> · au Choc des Boosters : <b>${d.jeux?.choc || 0}</b></p>
      <p class="small">Notifications acceptées : <b>${tel.ios || 0}</b> iPhone · <b>${tel.android || 0}</b> Android</p>
      <p class="small muted">Un « jour de jeu » est un jour où l’offrande du jour a été reçue. Tes comptes au badge Créateur ne sont pas comptés.</p></section>`;
}

export function openDashboard() {
  const sheet = openSheet('', { full: true, cls: 'creator db', label: 'Tableau de bord' });
  const draw = (inner) => sheet.setContent(`<h2>${icon('crown')} Tableau de bord</h2>${inner}
    <button class="btn block gold" data-db="again">${icon('refresh')}Actualiser</button>`);
  async function run() {
    draw('<p class="small muted center">Chargement…</p>');
    if (!cloud.isLoggedIn()) { draw('<p class="srv-warn">Connecte-toi d’abord à ton compte créateur.</p>'); return; }
    const r = await cloud.probe('/rest/v1/rpc/createur_stats', {});
    if (r.ok && r.data) { draw(`${dashboardHTML(r.data)}<p class="small muted center">Relevé du ${esc(new Date(r.data.at || Date.now()).toLocaleString('fr-FR'))}</p>`); return; }
    if (r.status === 404 || /^(PGRST202|42883)$/.test(r.code)) { draw('<p class="srv-warn">Le tableau de bord n’est pas encore installé : colle <b>supabase/22-tableau-de-bord.sql</b> dans Supabase → SQL Editor → New query → Run.</p>'); return; }
    draw(`<p class="srv-warn">${esc(r.msg || 'Le serveur ne répond pas.')}</p>`);
  }
  sheet.body.addEventListener('click', (e) => { if (e.target.closest('[data-db="again"]')) run(); });
  run();
  return sheet;
}
