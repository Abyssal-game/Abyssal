// Compte : connexion, pseudo public, sauvegarde en ligne, déconnexion, suppression du compte.
import * as cloud from '../cloud/cloud.js';
import { sync, onSync, afterLogin, pushNow, restoreFromCloud, setPseudo, refreshProfile, resumeSync } from '../cloud/sync.js';
import { icon } from '../ui/icons.js';
import { esc, toast, confirmBox, bindActions } from '../ui/dom.js';
import { blockedIds, clearBlocked, isMaskedPseudo } from '../core/moderation.js';

// v321 : règle des mots de passe réglée dans Supabase (Authentication → Password requirements)
const PW_RULE = '8 caractères au moins, avec une majuscule, une minuscule, un chiffre et un symbole (! ? # …)';
const pwOk = (p) => p.length >= 8 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);

const ago = (t) => {
  if (!t) return 'jamais';
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  return new Date(t).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
};

export default function account(app, root) {
  let busy = false, lastEmail = '', mode = app.params?.[0] === 'motdepasse' ? 'newpass' : 'login';
  function render() {
    const u = cloud.currentUser();
    // v318 : nouveau mot de passe après un lien de récupération (adresse #/compte/motdepasse), même connecté
    if (mode === 'newpass' && u) {
      root.innerHTML = `
        <header class="screen-head ui-hero bn-account"><h1>Nouveau mot de passe</h1><p class="muted">${esc(u.email || '')}</p></header>
        <form class="panel stack acc-form" id="newpass">
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
        <form class="panel stack acc-form" id="login">
          <label class="acc-l"><span class="small muted">E-mail</span><input class="input plain" type="email" name="email" autocomplete="username" inputmode="email" required value="${esc(lastEmail)}"></label>
          ${forgot ? '' : `<label class="acc-l"><span class="small muted">Mot de passe</span><input class="input plain" type="password" name="password" autocomplete="${signup ? 'new-password' : 'current-password'}" required ${signup ? 'minlength="8" placeholder="8 caractères, Aa1 et symbole"' : ''}></label>${signup ? `<p class="small muted acc-pwrule">${PW_RULE}.</p>` : ''}`}
          ${forgot ? '<p class="small muted">Tu recevras un e-mail avec un lien : il te ramène au jeu pour choisir un nouveau mot de passe.</p>' : ''}
          <button class="btn primary block" type="submit" ${busy ? 'disabled' : ''}>${icon(forgot ? 'key' : 'user')}${busy ? 'Un instant…' : forgot ? 'Envoyer le lien' : signup ? 'Créer mon compte' : 'Se connecter'}</button>
          ${signup ? `<p class="small muted">En créant un compte, tu acceptes la <a href="confidentialite.html" target="_blank" rel="noopener">politique de confidentialité</a>. Il faut avoir 13 ans ou plus.</p>` : forgot ? `<button type="button" class="btn ghost small" data-mode="login">Retour</button>` : `<button type="button" class="btn ghost small" data-mode="forgot">Mot de passe oublié ?</button>`}
        </form>
        <p class="small muted acc-privacy">${icon('lock')} Données conservées : ton e-mail, ton pseudo et ta sauvegarde de jeu. Rien d’autre. Tu peux supprimer ton compte à tout moment.</p>`;
      root.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { lastEmail = root.querySelector('[name=email]')?.value || lastEmail; mode = b.dataset.mode; render(); }));
      root.querySelector('#login').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (busy) return;
        const f = new FormData(e.target);
        lastEmail = String(f.get('email'));
        busy = true; render();
        try {
          if (forgot) {
            await cloud.recover(lastEmail);
            mode = 'login';
            toast('Si un compte existe avec cet e-mail, un lien vient d’être envoyé. Regarde aussi les indésirables.', { kind: 'success', icon: 'key', ms: 8000 });
          } else if (signup) {
            if (!pwOk(String(f.get('password')))) throw new Error(`Mot de passe trop faible : ${PW_RULE}.`);
            const r = await cloud.signUp(lastEmail, String(f.get('password')));
            if (r.loggedIn) {
              const k = await afterLogin();
              toast(k === 'pulled' ? 'Compte créé et connecté : ta partie en ligne est chargée.' : 'Compte créé : ta partie est maintenant sauvegardée en ligne.', { kind: 'success', icon: 'user' });
            } else {
              mode = 'login';
              toast('Compte créé ! Un e-mail de confirmation t’a été envoyé : touche son lien, puis reviens te connecter ici.', { kind: 'success', icon: 'user', ms: 10000 });
            }
          } else {
            await cloud.signIn(lastEmail, String(f.get('password')));
            const r = await afterLogin();
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
        ${p?.badge === 'createur' ? '<a class="btn gold small" href="#/parametres">Mode Créateur (dans Réglages)</a>' : ''}
        <form class="row gap acc-pseudo" id="pseudo"><input class="input plain" name="pseudo" maxlength="16" minlength="3" placeholder="Ton pseudo" value="${esc(p?.pseudo || '')}" required><button class="btn primary" type="submit">OK</button></form>
        ${p?.pseudo ? '' : '<p class="small acc-warn">Choisis un pseudo pour apparaître au classement de la Descente.</p>'}
        ${isMaskedPseudo(p?.pseudo) ? '<p class="small acc-warn">Ton pseudo a été signalé par plusieurs joueurs et a été masqué. Choisis-en un autre.</p>' : ''}
        <p class="small muted">Dans un classement, touche le pseudo d’un joueur pour le signaler ou le masquer.${blockedIds().length ? ` Joueurs masqués sur cet appareil : <b>${blockedIds().length}</b>.` : ''}</p>
        ${blockedIds().length ? `<button class="btn small" data-act="unblock">${icon('eye')}Réafficher les joueurs masqués</button>` : ''}
      </section>
      <section class="panel stack">
        <h2>Sauvegarde en ligne</h2>
        <p class="small acc-sync ${sync.status}">${st}</p>
        <p class="small muted">Ta partie est envoyée automatiquement quelques secondes après chaque action, et quand tu quittes l’app.</p>
        ${sync.status === 'paused' ? `<button class="btn primary small" data-act="resume">${icon('refresh')}Reprendre la synchronisation</button>` : ''}<div class="row gap wrap"><button class="btn small" data-act="push">${icon('upload')}Sauvegarder maintenant</button><button class="btn small" data-act="pull">${icon('download')}Récupérer la partie en ligne</button></div>
      </section>
      <section class="panel stack">
        <button class="btn block" data-act="logout">Se déconnecter</button>
        <button class="btn danger small" data-act="delete">${icon('trash')}Supprimer mon compte</button>
        <p class="small muted">La suppression efface ton profil, ta sauvegarde en ligne et tes scores. Ta partie reste sur cet appareil.</p>
      </section>`;
    root.querySelector('#pseudo').addEventListener('submit', async (e) => {
      e.preventDefault();
      try { await setPseudo(String(new FormData(e.target).get('pseudo'))); toast('Pseudo enregistré.', { kind: 'success', icon: 'user' }); render(); }
      catch (err) { toast(esc(err.message), { kind: 'error', icon: 'info' }); }
    });
  }
  bindActions(root, {
    unblock() { clearBlocked(); toast('Tous les joueurs sont de nouveau affichés.', { icon: 'user' }); render(); },
    async resume() { try { await resumeSync(); } catch (err) { toast(esc(err.message), { kind: 'error' }); } render(); },
    async push() { if (sync.status === 'paused') { toast('Choisis d’abord quelle partie garder (Reprendre la synchronisation).', { icon: 'info' }); return; } await pushNow(); toast(sync.status === 'ok' ? 'Partie sauvegardée en ligne.' : esc(sync.error || 'Échec de la sauvegarde.'), { kind: sync.status === 'ok' ? 'success' : 'error', icon: 'upload' }); render(); },
    async pull() {
      if (!(await confirmBox('Remplacer la partie de cet appareil par la partie en ligne ?', { ok: 'Remplacer' }))) return;
      try { await restoreFromCloud(); toast('Partie en ligne chargée.', { kind: 'success', icon: 'download' }); } catch (err) { toast(esc(err.message), { kind: 'error' }); }
    },
    async logout() { await pushNow(); await cloud.signOut(); toast('Déconnecté. Ta partie reste sur cet appareil.', { icon: 'user' }); render(); },
    async delete() {
      if (!(await confirmBox('Supprimer définitivement ton compte, ton profil, ta sauvegarde en ligne et tes scores ?', { ok: 'Supprimer', danger: true }))) return;
      if (!(await confirmBox('Dernière confirmation : cette action est irréversible.', { ok: 'Oui, supprimer', danger: true }))) return;
      try { await cloud.deleteAccount(); toast('Compte supprimé.', { icon: 'trash' }); } catch (err) { toast(esc(err.message), { kind: 'error' }); }
      render();
    },
  });
  const off = onSync(() => { if (!busy) render(); });
  render();
  refreshProfile();
  return () => off();
}
