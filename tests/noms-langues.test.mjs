// v668 : depuis la v657, des traductions de phrases avaient été ajoutées par erreur à la liste des noms (`names`),
// où t() ne les trouvait pas. La liste des noms ne contient que des noms (pas de phrase, de balise ni de marqueur).
import test from 'node:test';
import assert from 'node:assert/strict';

for (const l of ['en', 'es', 'de', 'it', 'pt']) {
  test(`langue ${l} : la liste des noms ne contient que des noms`, async () => {
    const m = await import(`../js/i18n/${l}.js`);
    const bad = Object.keys(m.names || {}).filter((k) => /[{<]|[.!?]$| : /.test(k));
    assert.deepEqual(bad, []);
  });
}
