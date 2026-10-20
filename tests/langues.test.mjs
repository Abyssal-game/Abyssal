// v506 : dictionnaires de traduction : chaque traduction garde les marqueurs ({0}, {e0}, {name}) et les balises de sa clé française
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const marks = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
const tags = (s) => (s.match(/<\/?(b|i|small|br|em|strong|u|sup|sub)>/g) || []).sort().join(',');

for (const f of fs.readdirSync(new URL('../js/i18n/', import.meta.url)).filter((x) => x.endsWith('.js'))) {
  test(`dictionnaire ${f} : marqueurs et balises conservés`, async () => {
    const dict = (await import(`../js/i18n/${f}`)).default;
    assert.ok(Object.keys(dict).length > 1000);
    for (const [k, v] of Object.entries(dict)) {
      assert.equal(typeof v, 'string', k);
      assert.equal(marks(v), marks(k), `marqueurs : ${k}`);
      assert.equal(tags(v), tags(k), `balises : ${k}`);
    }
  });
}

test('le choix de langue ne propose que des langues qui ont un dictionnaire', async () => {
  const src = fs.readFileSync(new URL('../js/i18n.js', import.meta.url), 'utf8');
  const langs = Object.keys(eval(`(${src.match(/LANGS = (\{[^}]+\})/)[1]})`));
  for (const l of langs) if (l !== 'fr') assert.ok(fs.existsSync(new URL(`../js/i18n/${l}.js`, import.meta.url)), l);
});
