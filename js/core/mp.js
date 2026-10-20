// v519 : mini-jeux contre d'autres joueurs (supabase/09-multijoueur.sql). Le serveur tient les parties et applique les règles.
export const MP_HOURS = 12; // partie lente : délai pour jouer chaque coup ; passé ce délai, la partie est perdue
export const MP_FAST_SECS = 30; // v522 : partie rapide : secondes pour jouer chaque coup (les deux joueurs connectés)
export const MP_REWARD = { win: 40, paidPerDay: 5, xp: 10 }; // éclats par victoire (5 victoires payées par jour)
export const MP_GAMES = ['sceaux', 'pacte']; // v523 : le Pacte aussi
