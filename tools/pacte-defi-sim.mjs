// v899 : combien de fois chaque adversaire du Pacte tente « Défier le pacte », réussite et victoires (joueur simulé = même caractère, sans défi). node tools/pacte-defi-sim.mjs 400
import { loadCatalog, rngFrom } from '../tests/helpers.mjs';
import * as PA from '../js/core/pacte.js';
const cat = loadCatalog();
const N = +process.argv[2] || 300;
for (const T of PA.TABLES) {
  let games = 0, tries = 0, ok = 0, wins = 0;
  for (let i = 0; i < N; i++) {
    const st = PA.newGame(cat, { table: T.key, seed: 1000 + i }); const r = rngFrom(i + 7);
    let g = 0;
    while (!st.over && g++ < 400) {
      if (st.turn === 'p') { if (PA.aiWants(st, r)) PA.draw(st); else PA.stop(st); }
      else for (const ev of PA.aiTurn(st, r)) if (ev.dbl) { tries++; if (ev.result !== 'bust') ok++; }
    }
    games++; { const sc = st.final?.scores || st.scores; if (sc.a > sc.p) wins++; }
  }
  console.log(T.key.padEnd(9), PA.RIVALS[T.rival].name.padEnd(26), 'défis par partie', (tries / games).toFixed(2), 'réussis', tries ? Math.round(ok / tries * 100) + ' %' : '-', 'victoires IA', Math.round(wins / games * 100) + ' %');
}
