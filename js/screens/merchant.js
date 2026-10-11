// Marchand : objets pour l'aventure (soins, torches, coffres, clés) et le sac du joueur.
import { itemsShopHTML, bindItemShop, bagHTML, bindBag } from './items.js';

export default function merchant(app, root) {
  const g = app.game;
  function render() {
    root.innerHTML = `
      <header class="screen-head"><h1>Marchand</h1><p class="muted">De quoi préparer tes expéditions.</p></header>
      ${bagHTML(g)}
      ${itemsShopHTML(g)}`;
  }
  bindItemShop(app, root, render);
  bindBag(app, root, render);
  render();
  app.refreshView = render;
  return () => { app.refreshView = null; };
}
