/*
 * Turns the app's current screen state into the single "mode" string the
 * gesture engine interprets landmarks against. Centralizing this here keeps
 * App.jsx from having to know the engine's mode vocabulary.
 */
export function resolveGestureMode({
  screen,
  categoryMenuOpen,
  hasSelectedItem,
  qtyMode,
  cartOpen,
}) {
  if (screen === 'welcome') return 'welcome';
  if (screen === 'orderType') return 'order-type';
  if (screen === 'checkout') return 'payment';
  if (screen === 'success') return 'success';

  if (screen === 'menu') {
    if (categoryMenuOpen) return 'category-menu';
    if (hasSelectedItem) return qtyMode ? 'item-qty' : 'item-selected';
    if (cartOpen) return 'cart';
    return 'browse';
  }

  return 'browse';
}
