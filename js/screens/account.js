// Compte : connexion, pseudo public, sauvegarde en ligne, déconnexion, suppression du compte.
import * as cloud from '../cloud/cloud.js';
import { defaultSave, migrate } from '../core/save.js';
import { sync, onSync, afterLogin, pushNow, restoreFromCloud, setPseudo, refreshProfile, resumeSync, clearOwner } from '../cloud/sync.js';
import { icon } from '../ui/icons.js';
import { esc, toast, confirmBox, bindActions, openSheet } from '../ui/dom.js';
import { blockedIds, clearBlocked, isMaskedPseudo } from '../core/moderation.js';
import { clearAll, pushOff } from '../notify.js';
import { resetWatch } from '../cloud/mpwatch.js';
import { serverMode } from '../cloud/partie.js';
import { stashCode, pendingCode, tryPendingParrain } from '../ui/parrain.js'; /* v881 */
import { socialProviders, socialLogin } from '../social.js'; /* v917 */

// v321 : règle des mots de passe réglée dans Supabase (Authentication → Password requirements)
const PW_RULE = '8 caractères au moins, avec une majuscule, une minuscule, un chiffre et un symbole (! ? # …)';
const pwOk = (p) => p.length >= 8 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);

// v331 : le pseudo est demandé juste après l'inscription (sans lui : pas de classement ni de Tirage des Ombres)
export function askPseudo(app) {
  if (sync.profile?.pseudo || document.querySelector('.ps-sheet')) return;
  const sh = openSheet(`<div class="ps-sheet stack"><h2 class="center">Choisis ton nom</h2>
    <p class="small center muted">C’est le nom que les autres joueurs verront dans les classements, et grâce auquel tes amis te trouveront. <b>Choisis bien : il est définitif.</b></p>
    <form class="stack" id="ps-form" novalidate><input class="input plain" name="pseudo" maxlength="16" minlength="3" placeholder="3 à 16 lettres ou chiffres" autocomplete="nickname" value="${esc(app.game.s.name || '')}">
    <button class="btn primary block" type="submit">${icon('user')}Valider</button><button class="btn ghost small block" type="button" data-ps="later">Plus tard</button></form></div>`, { label: 'Ton nom', cls: 'sheet-small' });
  sh.body.querySelector('[data-ps="later"]').addEventListener('click', () => { sh.close(); tryPendingParrain(app); });
  sh.body.querySelector('#ps-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = String(new FormData(e.target).get('pseudo') || '').trim();
    if (v && !(await confirmBox(`Ton pseudo sera <b>${esc(v)}</b>, pour toujours. C’est bon ?`, { ok: 'Oui, c’est mon pseudo' }))) return;
    try { await setPseudo(v); if (!app.game.s.name) app.game.setName?.(v); toast(`Bienvenue, <b>${esc(v)}</b> !`, { kind: 'success', icon: 'user' }); sh.close(); app.refresh?.(); setTimeout(() => tryPendingParrain(app), 1500); }
    catch (err) { toast(esc(err.message), { kind: 'error', icon: 'info' }); }
  });
}

/* v917 : boutons « Continuer avec Apple / Google » (logos officiels, comme le demandent Apple et Google) */
const APPLE_SVG = '<svg viewBox="-0.5 -1 18 22" aria-hidden="true"><path fill="currentColor" d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9s-2-.9-3.4-.9C3.6 4.8 1.9 5.8 1 7.4c-1.9 3.2-.5 8 1.3 10.6.9 1.3 2 2.7 3.4 2.7 1.3-.1 1.9-.9 3.5-.9s2.1.9 3.5.8c1.4 0 2.4-1.3 3.3-2.6 1-1.5 1.4-2.9 1.5-3-.1 0-2.9-1.1-2.9-4.4zM11.5 3c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.2 1.1.1 2.3-.6 3-1.5z"/></svg>';
const GOOGLE_SVG = '<svg viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>';
function socialHTML() {
  const ps = socialProviders();
  if (!ps.length) return '';
  const b = { apple: `<button type="button" class="btn block soc-b soc-apple" data-soc="apple">${APPLE_SVG}<span>Continuer avec Apple</span></button>`,
    google: `<button type="button" class="btn block soc-b soc-google" data-soc="google">${GOOGLE_SVG}<span>Continuer avec Google</span></button>` };
  return `<div class="soc stack">${ps.map((p) => b[p]).join('')}<p class="soc-or small muted"><span>ou avec ton e-mail</span></p></div>`;
}

const ago = (t) => {
  if (!t) return 'jamais';
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  return new Date(t).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
};

export default function account(app, root) {
  let busy = false, lastEmail = '', mode = app.params?.[0] === 'motdepasse' ? 'newpass' : app.params?.[0] === 'inscription' ? 'signup' : 'login';
  /* v777 : un œil pour afficher le mot de passe qu'on tape (création de compte, connexion, nouveau mot de passe) */
  const EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/></svg>';
  function addEyes() {
    root.querySelectorAll('input[type="password"]:not([data-eye])').forEach((inp) => {
      inp.dataset.eye = '1';
      const box = document.createElement('span'); box.className = 'pw-box';
      inp.replaceWith(box); box.appendChild(inp);
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pw-eye'; b.setAttribute('aria-label', 'Afficher le mot de passe'); b.innerHTML = EYE;
      b.addEventListener('click', (e) => { e.preventDefault(); const show = inp.type === 'password'; inp.type = show ? 'text' : 'password'; b.innerHTML = show ? EYE_OFF : EYE; b.setAttribute('aria-label', show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'); inp.focus({ preventScroll: true }); });
      box.appendChild(b);
    });
  }
  function render() { render0(); addEyes(); }
  function render0() {
    const u = cloud.currentUser();
    // v318 : nouveau mot de passe après un lien de récupération (adresse #/compte/motdepasse), même connecté
    if (mode === 'newpass' && u) {
      root.innerHTML = `
        <header class="screen-head ui-hero bn-account"><h1>Nouveau mot de passe</h1><p class="muted">${esc(u.email || '')}</p></header>
        <form class="panel stack acc-form" id="newpass" novalidate>
          <label class="acc-l"><span class="small muted">Nouveau mot de passe</span><input class="input plain" type="password" name="password" autocomplete="new-password" required minlength="8" placeholder="8 caractères, Aa1 et symbole"></label>
          <p class="small muted acc-pwrule">${PW_RULE}.</p>
          <label class="acc-l"><span class="small muted">Encore une fois</span><input class="input plain" type="password" name="password2" autocomplete="new-password" required minlength="8"></label>
          <button class="btn primary block" type="submit" ${busy ? 'disabled' : ''}>${icon('lock')}${busy ? 'Enregistrement…' : 'Enregistrer'}</button>
        </form>`;
      root.querySelector('#newpass').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (busy) return;
        const f = new FormData(e.target);
        if (!pwOk(String(f.get('password')))) { toast(`Mot de passe trop faible : ${PW_RULE}.`, { kind: 'error', icon: 'info', ms: 7000 }); return; }
        if (f.get('password') !== f.get('password2')) { toast('Les deux mots de passe sont différents.', { kind: 'error', icon: 'info' }); return; }
        busy = true; render();
        try {
          await cloud.updatePassword(String(f.get('password')));
          toast('Mot de passe enregistré.', { kind: 'success', icon: 'lock' });
          mode = 'login'; await afterLogin();
        } catch (err) { toast(esc(err.message), { kind: 'error', icon: 'info', ms: 6000 }); }
        busy = false; render();
      });
      return;
    }
    if (!u) {
      const signup = mode === 'signup', forgot = mode === 'forgot';
      root.innerHTML = `
        <header class="screen-head ui-hero bn-account"><h1>Compte</h1><p class="muted">Garde ta progression en ligne, retrouve-la sur n’importe quel appareil et affronte les joueurs du monde entier.</p></header>
        <div class="seg wide acc-seg" role="group" aria-label="Connexion ou inscription"><button type="button" class="seg-b" data-mode="login" aria-pressed="${!signup}">Se connecter</button><button type="button" class="seg-b" data-mode="signup" aria-pressed="${signup}">Créer un compte</button></div>
        ${forgot ? '' : socialHTML()}
        <form class="panel stack acc-form" id="login" novalidate>
          <label class="acc-l"><span class="small muted">E-mail</span><input class="input plain" type="email" name="email" autocomplete="username" inputmode="email" required value="${esc(lastEmail)}"></label>
          ${forgot ? '' : `<label class="acc-l"><span class="small muted">Mot de passe</span><input class="input plain" type="password" name="password" autocomplete="${signup ? 'new-password' : 'current-password'}" required ${signup ? 'minlength="8" placeholder="8 caractères, Aa1 et symbole"' : ''}></label>${signup ? `<p class="small muted acc-pwrule">${PW_RULE}.</p><label class="acc-l"><span class="small muted">Code de parrainage (facultatif)</span><input class="input plain" name="parrain" maxlength="16" autocomplete="off" autocapitalize="off" placeholder="Pseudo du joueur qui t’a invité" value="${esc(pendingCode())}"></label>` : ''}`}
          ${forgot ? '<p class="small muted">Tu recevras un e-mail avec un lien : il te ramène au jeu pour choisir un nouveau mot de passe.</p>' : ''}
          <button class="btn primary block" type="submit" ${busy ? 'disabled' : ''}>${icon(forgot ? 'key' : 'user')}${busy ? 'Un instant…' : forgot ? 'Envoyer le lien' : signup ? 'Créer mon compte' : 'Se connecter'}</button>
          ${signup ? `<p class="small muted">En créant un compte, tu acceptes la <a href="confidentialite.html" target="_blank" rel="noopener">politique de confidentialité</a>. Il faut avoir 13 ans ou plus.</p>` : forgot ? `<button type="button" class="btn ghost small" data-mode="login">Retour</button>` : `<button type="button" class="btn ghost small" data-mode="forgot">Mot de passe oublié ?</button>`}
        </form>
        <p class="small muted acc-privacy">${icon('lock')} Données conservées : ton e-mail, ton pseudo, ta sauvegarde et ce qui sert aux fonctions en ligne (amis, parties, classements). Détails dans la politique de confidentialité. Tu peux supprimer ton compte à tout moment.</p>`;
      root.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { lastEmail = root.querySelector('[name=email]')?.value || lastEmail; mode = b.dataset.mode; render(); }));
      /* v917 : Continuer avec Apple / Google : même suite qu'une connexion (partie envoyée ou chargée, pseudo demandé) */
      root.querySelectorAll('[data-soc]').forEach((b) => b.addEventListener('click', async () => {
        if (busy) return;
        const parrain = root.querySelector('[name=parrain]')?.value;
        busy = true; render();
        try {
          const u = await socialLogin(b.dataset.soc);
          if (u) {
            if (parrain) stashCode(parrain);
            const r = await afterLogin();
            if (!sync.profile?.pseudo) setTimeout(() => askPseudo(app), 900);
            toast(r === 'pulled' ? 'Connecté : ta partie en ligne est chargée.' : 'Connecté : ta partie est sauvegardée en ligne.', { kind: 'success', icon: 'user' });
          }
        } catch (err) { toast(esc(err.message || 'La connexion n’a pas abouti. Réessaie.'), { kind: 'error', icon: 'info', ms: 6000 }); }
        busy = false; render();
      }));
      root.querySelector('#login').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (busy) return;
        const f = new FormData(e.target);
        lastEmail = String(f.get('email')).trim();
        // v328 : validation du jeu, en français (le navigateur affichait son infobulle, parfois en anglais)
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(lastEmail)) { toast('Adresse e-mail invalide.', { kind: 'error', icon: 'info' }); return; }
        if (!forgot && !String(f.get('password') || '')) { toast('Entre ton mot de passe.', { kind: 'error', icon: 'info' }); return; }
        busy = true; render();
        try {
          if (forgot) {
            await cloud.recover(lastEmail);
            mode = 'login';
            toast('Si un compte existe avec cet e-mail, un lien vient d’être envoyé. Regarde aussi les indésirables.', { kind: 'success', icon: 'key', ms: 8000 });
          } else if (signup) {
            if (!pwOk(String(f.get('password')))) throw new Error(`Mot de passe trop faible : ${PW_RULE}.`);
            const r = await cloud.signUp(lastEmail, String(f.get('password')));
            stashCode(f.get('parrain')); /* v881 */
            if (r.loggedIn) {
              const k = await afterLogin();
              setTimeout(() => askPseudo(app), 900);
              toast(k === 'pulled' ? 'Compte créé et connecté : ta partie en ligne est chargée.' : 'Compte créé : ta partie est maintenant sauvegardée en ligne.', { kind: 'success', icon: 'user' });
            } else {
              mode = 'login';
              toast('Compte créé ! Un e-mail de confirmation t’a été envoyé : touche son lien, puis reviens te connecter ici.', { kind: 'success', icon: 'user', ms: 10000 });
            }
          } else {
            await cloud.signIn(lastEmail, String(f.get('password')));
            const r = await afterLogin();
            if (!sync.profile?.pseudo) setTimeout(() => askPseudo(app), 900);
            toast(r === 'pulled' ? 'Connecté : ta partie en ligne est chargée.' : 'Connecté : ta partie est sauvegardée en ligne.', { kind: 'success', icon: 'user' });
          }
        } catch (err) { toast(esc(err.message), { kind: 'error', icon: 'info', ms: 6000 }); }
        busy = false; render();
      });
      return;
    }
    const p = sync.profile;
    const st = { ok: `${icon('check')} Sauvegardée en ligne ${ago(sync.lastPush)}`, saving: 'Sauvegarde en cours…', error: `${icon('info')} ${esc(sync.error || 'Erreur')}`, paused: 'Synchronisation en pause : choisis quelle partie garder.', off: '' }[sync.status] || '';
    root.innerHTML = `
      <header class="screen-head ui-hero bn-account"><h1>Compte</h1><p class="muted">${esc(u.email || '')}</p></header>
      <section class="panel stack">
        <h2>Pseudo</h2>
        <p class="small muted">C’est le nom que les autres joueurs voient dans les classements.</p>
        ${p?.badge ? `<p class="small">Ton badge : ${cloud.badgeHTML(p.badge)}</p>` : ''}
        ${p?.pseudo && p.pseudo_locked ? `<p class="acc-pseudo-fixed">${icon('lock')} <b>${esc(p.pseudo)}</b> <span class="small muted">· définitif</span></p>` /* v500 : le pseudo ne se change plus */
          : `<form class="row gap acc-pseudo" id="pseudo"><input class="input plain" name="pseudo" maxlength="16" minlength="3" placeholder="Ton pseudo" value="${esc(isMaskedPseudo(p?.pseudo) ? '' : p?.pseudo || '')}" required><button class="btn primary" type="submit">OK</button></form><p class="small muted">Attention : une fois choisi, ton pseudo est définitif.</p>`}
        ${p?.pseudo ? '' : '<p class="small acc-warn">Choisis un pseudo pour apparaître aux classements.</p>'}
        ${isMaskedPseudo(p?.pseudo) ? '<p class="small acc-warn">Ton pseudo a été signalé par plusieurs joueurs et a été masqué. Choisis-en un autre.</p>' : ''}
        <p class="small muted">Touche le pseudo d’un joueur (classement, partie en ligne) pour ouvrir son profil : tu peux l’y signaler ou le masquer.${blockedIds().length ? ` Joueurs masqués sur cet appareil : <b>${blockedIds().length}</b>.` : ''}</p>
        ${blockedIds().length ? `<button class="btn small" data-act="unblock">${icon('eye')}Réafficher les joueurs masqués</button>` : ''}
      </section>
      ${serverMode() ? '' /* v544 : la partie est tenue par le serveur : plus rien à sauvegarder ni à récupérer à la main */ : `<section class="panel stack">
        <h2>Sauvegarde en ligne</h2>
        <p class="small acc-sync ${sync.status}">${st}</p>
        <p class="small muted">Ta partie est envoyée automatiquement quelques secondes après chaque action, et quand tu quittes l’app.</p>
        ${sync.status === 'paused' ? `<button class="btn primary small" data-act="resume">${icon('refresh')}Reprendre la synchronisation</button>` : ''}<div class="row gap wrap"><button class="btn small" data-act="push">${icon('upload')}Sauvegarder maintenant</button><button class="btn small" data-act="pull">${icon('download')}Récupérer la partie en ligne</button></div>
      </section>`}
      <section class="panel stack">
        <h2>Sécurité et aide</h2>
        <a class="btn small" href="#/compte/motdepasse">${icon('lock')}Changer mon mot de passe</a>
        <a class="btn small" href="mailto:contact@abyssal-game.fr?subject=ABYSSAL%20%E2%80%94%20aide">${icon('info')}Nous écrire (aide, bug)</a>
        <a class="btn ghost small" href="confidentialite.html" target="_blank" rel="noopener">${icon('book')}Politique de confidentialité</a>
      </section>
      <section class="panel stack">
        <button class="btn block" data-act="logout">Se déconnecter</button>
        <button class="btn danger small" data-act="delete">${icon('trash')}Supprimer mon compte</button>
        <p class="small muted">La suppression efface ton profil, ta sauvegarde en ligne et tes scores, et la partie de cet appareil.</p>
      </section>`;
    root.querySelector('#pseudo')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = String(new FormData(e.target).get('pseudo') || '').trim();
      if (v && !(await confirmBox(`Ton pseudo sera <b>${esc(v)}</b>, pour toujours. C’est bon ?`, { ok: 'Oui, c’est mon pseudo' }))) return;
      try { await setPseudo(String(new FormData(e.target).get('pseudo'))); toast('Pseudo enregistré.', { kind: 'success', icon: 'user' }); render(); }
      catch (err) { toast(esc(err.message), { kind: 'error', icon: 'info' }); }
    });
  }
  // v515 : partie de l'appareil remise à neuf (réglages gardés) après une déconnexion ou une suppression du compte
  function wipeLocal() {
    const keep = { ...app.game.s.settings, dev: false, devCode: false };
    const fresh = migrate(defaultSave());
    fresh.settings = { ...fresh.settings, ...keep };
    app.game.replaceSave(fresh);
    clearOwner(); /* v754 */
    /* v527 : rien de l'ancien compte ne reste (rappels du téléphone, nouvelles en ligne, parties ouvertes) */
    clearAll().catch(() => {}); resetWatch();
    Object.keys(app.state || {}).filter((k) => k.startsWith('mp_') || k === 'versus').forEach((k) => delete app.state[k]);
    app.applySettings?.();
    app.refresh?.();
  }
  bindActions(root, {
    unblock() { clearBlocked(); toast('Tous les joueurs sont de nouveau affichés.', { icon: 'user' }); render(); },
    async resume() { try { await resumeSync(); } catch (err) { toast(esc(err.message), { kind: 'error' }); } render(); },
    async push() { if (sync.status === 'paused') { toast('Choisis d’abord quelle partie garder (Reprendre la synchronisation).', { icon: 'info' }); return; } await pushNow(); toast(sync.status === 'ok' ? 'Partie sauvegardée en ligne.' : esc(sync.error || 'Échec de la sauvegarde.'), { kind: sync.status === 'ok' ? 'success' : 'error', icon: 'upload' }); render(); },
    async pull() {
      if (!(await confirmBox('Remplacer la partie de cet appareil par la partie en ligne ?', { ok: 'Remplacer' }))) return;
      try { await restoreFromCloud(); toast('Partie en ligne chargée.', { kind: 'success', icon: 'download' }); } catch (err) { toast(esc(err.message), { kind: 'error' }); }
    },
    async logout() {
      /* v515 : la partie est liée au compte : elle part en ligne, puis quitte cet appareil (le suivant qui se connecte ne la récupère pas) */
      await pushNow();
      if (sync.status !== 'ok' && !(await confirmBox('Ta dernière progression n’a pas pu être envoyée sur ton compte (pas de réseau ?). Si tu te déconnectes maintenant, <b>elle sera perdue</b>.', { ok: 'Me déconnecter quand même', cancel: 'Rester connecté', danger: true }))) return;
      await pushOff(); /* v693 : ce téléphone ne reçoit plus les notifications du compte */
      await cloud.signOut();
      wipeLocal();
      toast('Déconnecté. Ta partie t’attend sur ton compte.', { icon: 'user' });
      render();
    },
    async delete() {
      if (!(await confirmBox('Supprimer définitivement ton compte, ton profil, ta sauvegarde en ligne et tes scores ?', { ok: 'Supprimer', danger: true }))) return;
      if (!(await confirmBox('Dernière confirmation : cette action est irréversible.', { ok: 'Oui, supprimer', danger: true }))) return;
      try { await cloud.deleteAccount(); wipeLocal(); toast('Compte supprimé.', { icon: 'trash' }); } catch (err) { toast(esc(err.message), { kind: 'error' }); }
      render();
    },
  });
  const off = onSync(() => { if (!busy) render(); });
  render();
  refreshProfile();
  return () => off();
}
