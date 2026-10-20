// v519 : mini-jeux contre d'autres joueurs (supabase/09-multijoueur.sql). Le serveur tient les parties et applique les règles.
export const MP_HOURS = 12; // délai pour jouer chaque coup ; passé ce délai, la partie est perdue
export const MP_REWARD = { win: 40, paidPerDay: 5, xp: 10 }; // éclats par victoire (5 victoires payées par jour)
export const MP_GAMES = ['sceaux'];
