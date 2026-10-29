// v680 : vérification des achats payés (App Store, Google Play) auprès de RevenueCat.
// Le téléphone paie par l'App Store ; RevenueCat garde la liste des achats de chaque compte (identifiant = identifiant
// du compte Supabase). Le serveur de partie lit cette liste avec la clé secrète RevenueCat (secret `REVENUECAT_SECRET`
// de la fonction Supabase, jamais dans le dépôt) et donne chaque achat une seule fois (`game.iapApply`).

// Réponse de GET /v1/subscribers/{id} → [{ id, product, at, sandbox }]
export function revenueCatTx(json) {
  const out = [], sub = json?.subscriber || {};
  for (const [product, list] of Object.entries(sub.non_subscriptions || {})) {
    for (const t of Array.isArray(list) ? list : []) {
      const id = t?.store_transaction_id || t?.id;
      /* v908 : Google Play peut nommer un produit « identifiant:option » : seul l'identifiant compte */
      if (id) out.push({ id: String(id), product: product.split(':')[0], at: t.purchase_date || null, sandbox: !!t.is_sandbox, store: t.store || null });
    }
  }
  return out.sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

// Lecteur des achats d'un compte : (uid) => Promise<[...]>. Sans clé : null (achats indisponibles).
export function createRevenueCat({ key, fetch: f = globalThis.fetch } = {}) {
  if (!key) return null;
  return async (uid) => {
    const res = await f(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(uid)}`, {
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    });
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`Vérification des achats impossible (${res.status}). Réessaie dans un instant.`);
    return revenueCatTx(await res.json());
  };
}
