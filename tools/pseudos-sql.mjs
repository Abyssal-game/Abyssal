// Recopie les listes de js/core/moderation.js dans pseudo_ok (supabase/06-signalements.sql et 14-pseudos.sql).
// node tools/pseudos-sql.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { BANNED_PARTS, BANNED_WORDS, RESERVED } from '../js/core/moderation.js';
const fmt = (a) => { const out = []; let line = '   '; for (const w of a) { const t = ` '${w}',`; if (line.length + t.length > 120) { out.push(line); line = '   '; } line += t; } out.push(line); return out.join('\n').replace(/,$/, ''); };
for (const f of ['supabase/06-signalements.sql', 'supabase/14-pseudos.sql']) {
  let s = readFileSync(new URL('../' + f, import.meta.url), 'utf8');
  for (const [name, list] of [['parts', BANNED_PARTS], ['words', BANNED_WORDS], ['reserved', RESERVED]]) {
    s = s.replace(new RegExp(`(  ${name} text\\[\\] := array\\[\\n)[^\\]]+(\\n  \\];)`), (m, a, b) => a + fmt(list) + b);
  }
  writeFileSync(new URL('../' + f, import.meta.url), s);
}
