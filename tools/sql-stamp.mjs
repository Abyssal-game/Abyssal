// v678 : empreinte de chaque fichier SQL qui se recolle par-dessus. Le serveur la garde (table sql_stamps) quand le
// propriétaire colle le fichier ; Mode Créateur → « État du serveur » compare avec js/cloud/sql-stamps.js pour dire
// exactement quel fichier recoller. À relancer après tout changement d'un de ces fichiers (un test le vérifie) :
//   node tools/sql-stamp.mjs
import fs from 'node:fs';
import crypto from 'node:crypto';

export const STAMPED = ['05', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '19', '21'];
const DIR = new URL('../supabase/', import.meta.url);
const A = '-- ABYSSAL:empreinte (écrite par tools/sql-stamp.mjs, ne pas modifier)', Z = '-- ABYSSAL:fin';

export const fileOf = (n) => fs.readdirSync(DIR).find((f) => f.startsWith(`${n}-`) && f.endsWith('.sql'));
export const strip = (txt) => txt.replace(new RegExp(`\\n?${A.replace(/[()]/g, '\\$&')}[\\s\\S]*?${Z}\\n?`), '\n').replace(/\n{3,}/g, '\n\n');
export const hashOf = (txt) => crypto.createHash('sha256').update(strip(txt).trim()).digest('hex').slice(0, 12);

const block = (n, h) => `${A}
create table if not exists public.sql_stamps (file text primary key, stamp text not null, at timestamptz not null default now());
alter table public.sql_stamps enable row level security;
revoke all on public.sql_stamps from public, anon, authenticated;
insert into public.sql_stamps (file, stamp) values ('${n}', '${h}') on conflict (file) do update set stamp = excluded.stamp, at = now();
create or replace function public.sql_stamps() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(file, stamp), '{}'::jsonb) from public.sql_stamps;
$$;
revoke execute on function public.sql_stamps() from public, anon;
grant execute on function public.sql_stamps() to authenticated;
${Z}
`;

export function stampAll() {
  const out = {};
  for (const n of STAMPED) {
    const f = fileOf(n), p = new URL(f, DIR);
    const body = strip(fs.readFileSync(p, 'utf8')).trimEnd() + '\n', h = hashOf(body);
    /* le bloc va juste avant la vérification finale (le SQL Editor montre le dernier résultat) */
    const i = body.lastIndexOf('\n-- Vérification');
    const txt = i >= 0 ? `${body.slice(0, i + 1)}\n${block(n, h)}${body.slice(i)}` : `${body}\n${block(n, h)}`;
    fs.writeFileSync(p, txt);
    out[n] = { file: f, stamp: h };
  }
  fs.writeFileSync(new URL('../js/cloud/sql-stamps.js', import.meta.url),
    `// v678 : écrit par tools/sql-stamp.mjs, ne pas modifier à la main.\nexport const SQL_STAMPS = ${JSON.stringify(out, null, 2)};\n`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(stampAll());
