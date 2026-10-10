// Compte : connexion, pseudo public, sauvegarde en ligne, déconnexion, suppression du compte.
import * as cloud from '../cloud/cloud.js';
import { sync, onSync, afterLogin, pushNow, restoreFromCloud, setPseudo, refreshProfile } from '../cloud/sync.js';
import { icon } from '../ui/icons.js';
import { esc, toast, confirmBox, bindActions } from '../ui/dom.js';

const ago = (t) => {
  if (!t) return 'jamais';
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'à l’instant';
  if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
  return new Date(t).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
};

export default function account(app, root) {
  let busy = false, lastEmail = '';
  function render() {
    const u = cloud.currentUser();
    if (!u) {
      root.innerHTML = `
        <header class="screen-head"><h1>Compte</h1><p class="muted">Garde ta progression en ligne, retrouve-la sur n’importe quel appareil et affronte les joueurs du monde entier.</p></header>
        <form class="panel stack acc-form" id="login">
          <label class="acc-l"><span class="small muted">E-mail</span><input class="input plain" type="email" name="email" autocomplete="username" required value="${esc(lastEmail)}"></label>
          <label class="acc-l"><span class="small muted">Mot de passe</span><input class="input plain" type="password" name="password" autocomplete="current-password" required minlength="6"></label>
          <button class="btn primary block" type="submit" ${busy ? 'disabled' : ''}>${icon('user')}${busy ? 'Connexion…' : 'Se connecter'}</button>
          <p class="small muted">Pendant la construction du jeu, les comptes sont créés <b>sur invitation</b>.</p>
        </form>
        <p class="small muted acc-privacy">${icon('lock')} Données conservées : ton e-mail, ton pseudo et ta sauvegarde de jeu. Rien d’autre. Tu peux supprimer ton compte à tout moment.</p>`;
      root.querySelector('#login').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (busy) return;
        const f = new FormData(e.target);
        lastEmail = String(f.get('email'));
        busy = true; render();
        try {
          await cloud.signIn(String(f.get('email')), String(f.get('password')));
          const r = await afterLogin();
          toast(r === 'pulled' ? 'Connecté : ta partie en ligne est chargée.' : 'Connecté : ta partie est sauvegardée en ligne.', { kind: 'success', icon: 'user' });
        } catch (err) { toast(esc(err.message), { kind: 'error', icon: 'info', ms: 6000 }); }
        busy = false; render();
      });
      return;
    }
    const p = sync.profile;
    const st = { ok: `${icon('check')} Sauvegardée en ligne ${ago(sync.lastPush)}`, saving: 'Sauvegarde en cours…', error: `${icon('info')} ${esc(sync.error || 'Erreur')}`, paused: 'Synchronisation en pause', off: '' }[sync.status] || '';
    root.innerHTML = `
      <header class="screen-head"><h1>Compte</h1><p class="muted">${esc(u.email || '')}</p></header>
      <section class="panel stack">
        <h2>Pseudo</h2>
        <p class="small muted">C’est le nom que les autres joueurs voient dans les classements.</p>
        ${p?.badge ? `<p class="small">Ton badge : ${cloud.badgeHTML(p.badge)}</p>` : ''}
        ${p?.badge === 'createur' ? '<a class="btn gold small" href="#/parametres">Mode Créateur (dans Réglages)</a>' : ''}
        <form class="row gap acc-pseudo" id="pseudo"><input class="input plain" name="pseudo" maxlength="16" minlength="3" placeholder="Ton pseudo" value="${esc(p?.pseudo || '')}" required><button class="btn primary" type="submit">OK</button></form>
        ${p?.pseudo ? '' : '<p class="small acc-warn">Choisis un pseudo pour apparaître au classement de la Descente.</p>'}
      </section>
      <section class="panel stack">
        <h2>Sauvegarde en ligne</h2>
        <p class="small acc-sync ${sync.status}">${st}</p>
        <p class="small muted">Ta partie est envoyée automatiquement quelques secondes après chaque action, et quand tu quittes l’app.</p>
        <div class="row gap wrap"><button class="btn small" data-act="push">${icon('upload')}Sauvegarder maintenant</button><button class="btn small" data-act="pull">${icon('download')}Récupérer la partie en ligne</button></div>
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
    async push() { await pushNow(); toast(sync.status === 'ok' ? 'Partie sauvegardée en ligne.' : esc(sync.error || 'Échec de la sauvegarde.'), { kind: sync.status === 'ok' ? 'success' : 'error', icon: 'upload' }); render(); },
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
