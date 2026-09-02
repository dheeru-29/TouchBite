import GestureBar from './GestureBar';

export default function KioskShell({ children, cartCount, onCart, onHome, showCart = true, gestureStatus = {} }) {
  const { dragActive, cursor, dragLabel } = gestureStatus;

  return (
    <main className="kiosk-shell">
      <header className="topbar">
        <button className="brand" onClick={onHome} aria-label="TouchBite home">
          <span className="brand__mark">T</span>
          <span>
            TOUCH<span>BITE</span>
          </span>
        </button>
        <div className="topbar__right">
          <span className="language">
            EN <small>⌄</small>
          </span>
          {showCart && (
            <button className="cart-button" onClick={onCart} aria-label={`Open cart, ${cartCount} items`}>
              <span>🛍</span>
              <b>{cartCount}</b>
              <em>Cart</em>
            </button>
          )}
        </div>
      </header>

      {children}

      {dragActive && cursor && (
        <div className="drag-ghost" style={{ left: `${cursor.x}vw`, top: `${cursor.y}vh` }}>
          {dragLabel || '🛍'}
        </div>
      )}

      <GestureBar {...gestureStatus} />
    </main>
  );
}
