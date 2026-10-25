// v693 : envoi des notifications du serveur (fonction Supabase « push », supabase/functions/push/index.ts).
// La base met chaque notification dans la file push_queue (supabase/17-notifications.sql) ; cette fonction la vide :
// texte dans la langue du joueur, puis envoi à Apple (APNs, HTTP/2, jeton JWT ES256 signé avec la clé .p8 du
// propriétaire, gardée dans les secrets de la fonction : APNS_KEY, APNS_KEY_ID, APNS_TEAM_ID ; jamais dans le dépôt).
// Android (Firebase) : pas encore branché, ses notifications sont marquées envoyées sans rien faire.

export const TOPIC = 'com.abyssalgame.abyssal';
const GAMES = {
  fr: { sceaux: 'Duels des Sceaux', pacte: 'Le Pacte', encheres: 'Les Enchères de Mammon', cryptes: 'Les Cryptes' },
  en: { sceaux: 'Seal Duels', pacte: 'The Pact', encheres: 'Mammon’s Auctions', cryptes: 'The Crypts' },
  es: { sceaux: 'Duelos de los Sellos', pacte: 'El Pacto', encheres: 'Las Subastas de Mammon', cryptes: 'Las Criptas' },
  de: { sceaux: 'Siegel-Duelle', pacte: 'Der Pakt', encheres: 'Mammons Auktionen', cryptes: 'Die Grüfte' },
  it: { sceaux: 'Duelli dei Sigilli', pacte: 'Il Patto', encheres: 'Le Aste di Mammon', cryptes: 'Le Cripte' },
  pt: { sceaux: 'Duelos dos Selos', pacte: 'O Pacto', encheres: 'Os Leilões de Mammon', cryptes: 'As Criptas' },
};
// {w} = pseudo de l'autre joueur, {g} = nom du jeu
const TEXTS = {
  fr: {
    turn: ['À toi de jouer !', '{w} a joué aux {g}. C’est ton tour.'],
    challenge: ['Nouveau défi', '{w} te défie aux {g}.'],
    accepted: ['Défi accepté', '{w} a accepté ton défi aux {g}. La partie commence !'],
    found: ['Adversaire trouvé', '{w} a rejoint ta partie aux {g}.'],
    end_win: ['Victoire !', 'Tu as gagné ta partie contre {w} aux {g}.'],
    end_lose: ['Partie terminée', '{w} a gagné la partie aux {g}.'],
    end_draw: ['Partie terminée', 'Égalité contre {w} aux {g}.'],
    wager: ['Le Choc des Boosters', '{w} te défie au Choc des Boosters.'],
    wager_done: ['Défi relevé !', '{w} a relevé ton défi au Choc des Boosters. Viens voir le résultat.'],
    friend: ['Demande d’ami', '{w} veut devenir ton ami.'],
    friend_ok: ['Nouvel ami', '{w} a accepté ta demande d’ami.'],
  },
  en: {
    turn: ['Your turn!', '{w} played in {g}. It’s your move.'],
    challenge: ['New challenge', '{w} challenges you to {g}.'],
    accepted: ['Challenge accepted', '{w} accepted your {g} challenge. The game begins!'],
    found: ['Opponent found', '{w} joined your {g} game.'],
    end_win: ['Victory!', 'You won your {g} game against {w}.'],
    end_lose: ['Game over', '{w} won the {g} game.'],
    end_draw: ['Game over', 'Draw against {w} in {g}.'],
    wager: ['The Booster Clash', '{w} challenges you to a Booster Clash.'],
    wager_done: ['Challenge accepted!', '{w} accepted your Booster Clash. Come see the result.'],
    friend: ['Friend request', '{w} wants to be your friend.'],
    friend_ok: ['New friend', '{w} accepted your friend request.'],
  },
  es: {
    turn: ['¡Te toca!', '{w} ha jugado en {g}. Es tu turno.'],
    challenge: ['Nuevo desafío', '{w} te desafía en {g}.'],
    accepted: ['Desafío aceptado', '{w} ha aceptado tu desafío en {g}. ¡Empieza la partida!'],
    found: ['Rival encontrado', '{w} se ha unido a tu partida de {g}.'],
    end_win: ['¡Victoria!', 'Has ganado tu partida contra {w} en {g}.'],
    end_lose: ['Partida terminada', '{w} ha ganado la partida de {g}.'],
    end_draw: ['Partida terminada', 'Empate contra {w} en {g}.'],
    wager: ['La Batalla de los Sobres', '{w} te reta a una Batalla de los Sobres.'],
    wager_done: ['¡Reto aceptado!', '{w} ha aceptado tu Batalla de los Sobres. Ven a ver el resultado.'],
    friend: ['Solicitud de amistad', '{w} quiere ser tu amigo.'],
    friend_ok: ['Nuevo amigo', '{w} ha aceptado tu solicitud de amistad.'],
  },
  de: {
    turn: ['Du bist dran!', '{w} hat bei {g} gespielt. Jetzt bist du am Zug.'],
    challenge: ['Neue Herausforderung', '{w} fordert dich bei {g} heraus.'],
    accepted: ['Herausforderung angenommen', '{w} hat deine Herausforderung bei {g} angenommen. Die Partie beginnt!'],
    found: ['Gegner gefunden', '{w} ist deiner Partie bei {g} beigetreten.'],
    end_win: ['Sieg!', 'Du hast deine Partie gegen {w} bei {g} gewonnen.'],
    end_lose: ['Partie beendet', '{w} hat die Partie bei {g} gewonnen.'],
    end_draw: ['Partie beendet', 'Unentschieden gegen {w} bei {g}.'],
    wager: ['Die Booster-Schlacht', '{w} fordert dich zur Booster-Schlacht heraus.'],
    wager_done: ['Herausforderung angenommen!', '{w} hat deine Booster-Schlacht angenommen. Sieh dir das Ergebnis an.'],
    friend: ['Freundschaftsanfrage', '{w} möchte dein Freund sein.'],
    friend_ok: ['Neuer Freund', '{w} hat deine Freundschaftsanfrage angenommen.'],
  },
  it: {
    turn: ['Tocca a te!', '{w} ha giocato a {g}. È il tuo turno.'],
    challenge: ['Nuova sfida', '{w} ti sfida a {g}.'],
    accepted: ['Sfida accettata', '{w} ha accettato la tua sfida a {g}. La partita comincia!'],
    found: ['Avversario trovato', '{w} si è unito alla tua partita a {g}.'],
    end_win: ['Vittoria!', 'Hai vinto la partita contro {w} a {g}.'],
    end_lose: ['Partita finita', '{w} ha vinto la partita a {g}.'],
    end_draw: ['Partita finita', 'Pareggio contro {w} a {g}.'],
    wager: ['La Sfida delle Buste', '{w} ti lancia una Sfida delle Buste.'],
    wager_done: ['Sfida accettata!', '{w} ha accettato la tua Sfida delle Buste. Vieni a vedere il risultato.'],
    friend: ['Richiesta di amicizia', '{w} vuole essere tuo amico.'],
    friend_ok: ['Nuovo amico', '{w} ha accettato la tua richiesta di amicizia.'],
  },
  pt: {
    turn: ['É a tua vez!', '{w} jogou em {g}. É a tua vez.'],
    challenge: ['Novo desafio', '{w} desafia você em {g}.'],
    accepted: ['Desafio aceito', '{w} aceitou seu desafio em {g}. A partida começa!'],
    found: ['Adversário encontrado', '{w} entrou na sua partida de {g}.'],
    end_win: ['Vitória!', 'Você venceu a partida contra {w} em {g}.'],
    end_lose: ['Partida encerrada', '{w} venceu a partida de {g}.'],
    end_draw: ['Partida encerrada', 'Empate contra {w} em {g}.'],
    wager: ['A Batalha dos Pacotes', '{w} desafia você para uma Batalha dos Pacotes.'],
    wager_done: ['Desafio aceito!', '{w} aceitou sua Batalha dos Pacotes. Venha ver o resultado.'],
    friend: ['Pedido de amizade', '{w} quer ser seu amigo.'],
    friend_ok: ['Novo amigo', '{w} aceitou seu pedido de amizade.'],
  },
};
// Page du jeu ouverte quand on touche la notification
const ROUTE = { turn: (d) => `#/${d.game}`, challenge: (d) => `#/${d.game}`, accepted: (d) => `#/${d.game}`, found: (d) => `#/${d.game}`, end: (d) => `#/${d.game}`, wager: () => '#/versus', wager_done: () => '#/versus', friend: () => '#/amis', friend_ok: () => '#/amis' };

export function messageOf(kind, data = {}, lang = 'fr') {
  const L = TEXTS[lang] ? lang : 'fr';
  const key = kind === 'end' ? `end_${['win', 'lose', 'draw'].includes(data.res) ? data.res : 'draw'}` : kind;
  const t = TEXTS[L][key] || TEXTS.fr[key];
  if (!t) return null;
  const who = String(data.who || '').slice(0, 24) || { fr: 'Ton adversaire', en: 'Your opponent', es: 'Tu rival', de: 'Dein Gegner', it: 'Il tuo avversario', pt: 'Seu adversário' }[L];
  const g = GAMES[L][data.game] || GAMES.fr[data.game] || '';
  const fill = (s) => s.replace('{w}', who).replace('{g}', g);
  return { title: fill(t[0]), body: fill(t[1]), route: (ROUTE[kind] || (() => '#/'))(data) };
}

// ——— Jeton d'identification auprès d'Apple (JWT ES256, valable 1 h, refait toutes les 50 min) ———
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uStr = (s) => b64u(new TextEncoder().encode(s));
function pemToDer(pem) {
  const b = String(pem).replace(/-----[A-Z ]+-----/g, '').replace(/\\n/g, '').replace(/\s+/g, '');
  const bin = atob(b); const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}
export async function apnsJwt({ key, keyId, teamId, now = Date.now() }) {
  const k = await crypto.subtle.importKey('pkcs8', pemToDer(key), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64uStr(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const body = b64uStr(JSON.stringify({ iss: teamId, iat: Math.floor(now / 1000) }));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, k, new TextEncoder().encode(`${head}.${body}`));
  return `${head}.${body}.${b64u(sig)}`;
}

// Vide la file : take() rend [{ id, kind, data, tokens: [{ token, platform, lang }] }] ; send(token, payload) → { status, reason }
export async function drain({ take, done, drop, send, limit = 50 }) {
  const rows = await take(limit);
  const ok = [];
  let sent = 0;
  for (const r of rows || []) {
    let delivered = true;
    for (const t of r.tokens || []) {
      if (t.platform !== 'ios') continue; /* Android : pas encore branché */
      const m = messageOf(r.kind, r.data, t.lang);
      if (!m) continue;
      const payload = { aps: { alert: { title: m.title, body: m.body }, sound: 'default', 'thread-id': `${r.kind}:${r.data?.game || ''}` }, route: m.route };
      const res = await send(t.token, payload);
      if (res.status === 200) sent++;
      else if (res.status === 410 || /BadDeviceToken|Unregistered|DeviceTokenNotForTopic/.test(res.reason || '')) await drop(t.token);
      else delivered = false; /* erreur passagère : la notification sera retentée (3 fois au plus) */
    }
    if (delivered) ok.push(r.id);
  }
  if (ok.length) await done(ok);
  return { rows: (rows || []).length, sent };
}

// Envoi vers Apple : serveur de production d'abord (TestFlight, App Store), puis serveur d'essai (app lancée depuis Xcode)
export function apnsSender({ getJwt, fetchFn = fetch }) {
  return async (token, payload) => {
    let last = { status: 0, reason: '' };
    for (const host of ['api.push.apple.com', 'api.sandbox.push.apple.com']) {
      try {
        const res = await fetchFn(`https://${host}/3/device/${token}`, {
          method: 'POST',
          headers: { authorization: `bearer ${await getJwt()}`, 'apns-topic': TOPIC, 'apns-push-type': 'alert', 'apns-priority': '10', 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.status === 200) return { status: 200 };
        let reason = '';
        try { reason = (await res.json())?.reason || ''; } catch (e) { /* rien */ }
        last = { status: res.status, reason };
        if (!/BadDeviceToken/.test(reason)) return last; /* seul un jeton d'un autre serveur mérite l'essai suivant */
      } catch (e) { last = { status: 0, reason: String(e?.message || e) }; }
    }
    return last;
  };
}
