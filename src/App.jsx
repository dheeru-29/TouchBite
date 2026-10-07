import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { menuApi, orderApi } from './services/api';
import { aiApi } from './services/aiApi';
import { stop as stopSpeech } from './utils/textToSpeech';
import { useCart } from './hooks/useCart';
import { useGestureControl } from './hooks/useGestureControl';
import { GESTURE_INTENTS } from './gestures/gestureTypes.js';
import { resolveGestureMode } from './gestures/gestureController.js';
import { categories } from './constants/categories';
import { PAYMENT_METHODS } from './constants/payments';
import { menuItems } from './data/menu';
import { handleImageError } from './utils/imageFallback';
import KioskShell from './components/kiosk/KioskShell';
import Button from './components/common/Button';
import CategoryMenu from './components/menu/CategoryMenu';
import MenuCard from './components/menu/MenuCard';
import ProductModal from './components/menu/ProductModal';
import CartPanel from './components/cart/CartPanel';
import GestureDebugOverlay from './components/gesture/GestureDebugOverlay';

function Welcome({ onStart, gestureStatus, cartItems, onCartUpdate, onAIProductSelect, assistantState }) {
  const heroBurger = menuItems.find((item) => item.id === 'smash-burger');
  const heroFries = menuItems.find((item) => item.id === 'sea-salt-fries');

  return (
    <KioskShell showCart={false} onHome={onStart} gestureStatus={gestureStatus} cartItems={cartItems} onCartUpdate={onCartUpdate} onProductSelect={onAIProductSelect} {...assistantState}>
      <section className="welcome">
        <div className="welcome__copy">
          <span className="eyebrow">Touchless ordering, made delightful</span>
          <h1>
            Welcome to
            <br />
            <span>TouchBite.</span>
          </h1>
          <p>Big flavour. Zero queues. Order your way with simple hand gestures, or tap whenever you prefer.</p>
          <Button onClick={onStart}>
            Start your order <span>→</span>
          </Button>
          <small>Hold an open palm, or tap to begin · No account needed</small>
        </div>
        <div className="welcome__visual">
          <div className="hero-orb" />
          <div className="food-float food-float--one"><img src={heroBurger.image} alt="Classic Smash Burger" onError={handleImageError} /></div>
          <div className="food-float food-float--two"><img src={heroFries.image} alt="Sea Salt Fries" onError={handleImageError} /></div>
          <div className="hand-guide">
            <span>✋</span>
            <div>
              <b>Gesture enabled</b>
              <p>Hold your palm open to begin</p>
            </div>
          </div>
        </div>
      </section>
    </KioskShell>
  );
}

function OrderType({ selected, onSelect, onChoose, onBack, gestureStatus, cartItems, onCartUpdate, onAIProductSelect, assistantState }) {
  const options = ['Dine in', 'Takeaway'];
  const choice = selected || options[0];

  return (
    <KioskShell showCart={false} onHome={onBack} gestureStatus={gestureStatus} cartItems={cartItems} onCartUpdate={onCartUpdate} onProductSelect={onAIProductSelect} {...assistantState}>
      <section className="order-type">
        <span className="eyebrow">Step 1 of 3</span>
        <h1>
          How are you enjoying
          <br />
          TouchBite today?
        </h1>
        <p>Swipe left or right to choose, or tap a card.</p>
        <div className="order-type__cards">
          {options.map((option) => (
            <button key={option} className={choice === option ? 'selected' : ''} onClick={() => onSelect(option)}>
              <span>{option === 'Dine in' ? '🍽' : '🛍'}</span>
              <h2>{option}</h2>
              <p>{option === 'Dine in' ? 'Relax, we’ll bring it to your table.' : 'Freshly prepared for life on the go.'}</p>
              <i>→</i>
            </button>
          ))}
        </div>
        <Button onClick={() => onChoose(choice)}>Continue with {choice}</Button>
      </section>
    </KioskShell>
  );
}

function Menu({
  items,
  loading,
  error,
  onRetry,
  highlightedIndex,
  onSelectCard,
  activeCategory,
  categoryMenuOpen,
  activeCatIndex,
  categoryProgress,
  onPickCategory,
  cartOpen,
  cart,
  onCart,
  onHome,
  onCartClose,
  onCartCheckout,
  selectedProduct,
  quantity,
  qtyMode,
  selectedOptions,
  dragActive,
  onToggleOption,
  onQuantityChange,
  onToggleQtyMode,
  onCloseProduct,
  onAddToCart,
  onProductSelect,
  assistantState,
  gestureStatus,
}) {
  const cardRefs = useRef([]);

  // Gesture browsing moves the highlight programmatically — without this,
  // once the highlighted card scrolls past the fold you'd have to scroll
  // manually to even see what's selected.
  useEffect(() => {
    const el = cardRefs.current[highlightedIndex];
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
  }, [highlightedIndex, items.length]);

  return (
    <KioskShell cartCount={cart.totals.count} onCart={onCart} onHome={onHome} gestureStatus={gestureStatus} cartItems={cart.items} onCartUpdate={cart.replaceItems} onProductSelect={onProductSelect} {...assistantState}>
      <section className="menu-page">
        <div className="menu-page__heading">
          <div>
            <span className="eyebrow">Crafted fresh for you · {activeCategory}</span>
            <h1>What are you craving?</h1>
          </div>
          <button className="order-chip" onClick={onHome}>
            Change order <b>↗</b>
          </button>
        </div>

        {loading && <div className="menu-feedback">Preparing the menu…</div>}
        {error && (
          <div className="menu-feedback menu-feedback--error">
            <p>{error}</p>
            <Button variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          </div>
        )}
        {!loading && !error && !items.length && (
          <div className="menu-feedback">Nothing is available in this category right now.</div>
        )}

        <div className="menu-grid">
          {items.map((item, index) => (
            <MenuCard
              key={item.id}
              ref={(el) => (cardRefs.current[index] = el)}
              item={item}
              onSelect={() => onSelectCard(item)}
              highlighted={index === highlightedIndex}
            />
          ))}
        </div>
      </section>

      <CategoryMenu open={categoryMenuOpen} activeIndex={activeCatIndex} progress={categoryProgress} onPick={onPickCategory} />

      {selectedProduct && (
        <ProductModal
          item={selectedProduct}
          quantity={quantity}
          qtyMode={qtyMode}
          selectedOptions={selectedOptions}
          dragActive={dragActive}
          onToggleOption={onToggleOption}
          onQuantityChange={onQuantityChange}
          onToggleQtyMode={onToggleQtyMode}
          onClose={onCloseProduct}
          onAdd={onAddToCart}
        />
      )}

      {cartOpen && (
        <CartPanel {...cart} onClose={onCartClose} onChangeQuantity={cart.changeQuantity} onRemove={cart.removeItem} onCheckout={onCartCheckout} />
      )}
    </KioskShell>
  );
}

function Checkout({ cart, orderType, payIndex, onBack, onConfirm, submitting, error, gestureStatus, onCartUpdate, onAIProductSelect, assistantState }) {
  const method = PAYMENT_METHODS[payIndex];

  return (
    <KioskShell cartCount={cart.totals.count} onCart={onBack} onHome={onBack} gestureStatus={gestureStatus} cartItems={cart.items} onCartUpdate={onCartUpdate} onProductSelect={onAIProductSelect} {...assistantState}>
      <section className="checkout-page">
        <div className="checkout-copy">
          <span className="eyebrow">Step 3 of 3</span>
          <h1>Almost there.</h1>
          <p>Swipe to choose a payment method, then hold 👍 to pay — or tap below.</p>
          <div className="payment-options">
            {PAYMENT_METHODS.map((option, index) => (
              <button key={option.id} className={index === payIndex ? 'selected' : ''} onClick={() => onConfirm(index, false)}>
                <i>{option.icon}</i>
                <span>
                  <b>{option.name}</b>
                  <small>{option.note}</small>
                </span>
                <em>{index === payIndex ? '✓' : ''}</em>
              </button>
            ))}
          </div>
          {error && <p className="checkout-error">{error}</p>}
        </div>
        <aside className="checkout-summary">
          <p>
            Order type <span>{orderType}</span>
          </p>
          <p>
            Subtotal <span>₹{cart.totals.subtotal}</span>
          </p>
          <p>
            GST (5%) <span>₹{cart.totals.tax}</span>
          </p>
          <div>
            <span>Total</span>
            <strong>₹{cart.totals.total}</strong>
          </div>
          <Button onClick={() => onConfirm(payIndex, true)} disabled={submitting}>
            {submitting ? 'Placing order…' : `Pay with ${method.name} · ₹${cart.totals.total}`}
          </Button>
          <small>By placing your order, you agree to our store terms.</small>
        </aside>
      </section>
    </KioskShell>
  );
}

function Success({ order, onRestart, gestureStatus, cartItems, onCartUpdate, onAIProductSelect, assistantState }) {
  return (
    <KioskShell showCart={false} onHome={onRestart} gestureStatus={gestureStatus} cartItems={cartItems} onCartUpdate={onCartUpdate} onProductSelect={onAIProductSelect} {...assistantState}>
      <section className="success-page">
        <div className="success-confetti">✦ · ✦ · ✦</div>
        <div className="success-check">✓</div>
        <span className="eyebrow">Payment confirmed</span>
        <h1>Order confirmed!</h1>
        <p>Your delicious order is in the kitchen. We’ll let you know as soon as it’s ready.</p>
        <div className="order-number">
          <span>Order number</span>
          <strong>{order.orderNumber}</strong>
          <small>{order.orderType} · Keep this handy</small>
        </div>
        <div className="status-track">
          <div className="active">
            <i>✓</i>
            <b>Order received</b>
            <small>Just now</small>
          </div>
          <div className="active">
            <i>♨</i>
            <b>Preparing</b>
            <small>Up next</small>
          </div>
          <div>
            <i>🛍</i>
            <b>Ready</b>
            <small>About 8–12 min</small>
          </div>
        </div>
        <Button variant="secondary" onClick={onRestart}>
          Start a new order
        </Button>
      </section>
    </KioskShell>
  );
}

export default function App() {
  const cart = useCart();

  const [screen, setScreen] = useState('welcome');
  const [orderType, setOrderType] = useState('Dine in');
  const [order, setOrder] = useState(null);

  const [menuCategory, setMenuCategory] = useState('Featured');
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [activeCatIndex, setActiveCatIndex] = useState(0);

  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [assistantResults, setAssistantResults] = useState([]);
  const [assistantSelectedIndex, setAssistantSelectedIndex] = useState(0);

  const [cartOpen, setCartOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [qtyMode, setQtyMode] = useState(false);

  const [payIndex, setPayIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');

  const [gestureEnabled] = useState(true);
  const updateAssistantResults = useCallback((results) => {
    setAssistantResults(results);
    setAssistantSelectedIndex(0);
  }, []);
  const assistantState = {
    assistantResults,
    onAssistantResultsChange: updateAssistantResults,
    assistantSelectedIndex,
    onAssistantSelectedIndexChange: setAssistantSelectedIndex,
  };

  const loadMenu = useCallback(() => {
    let cancelled = false;
    setItemsLoading(true);
    setItemsError('');
    menuApi
      .getMenu(menuCategory)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err) => {
        if (!cancelled) setItemsError(err.message);
      })
      .finally(() => {
        if (!cancelled) setItemsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [menuCategory]);

  useEffect(() => loadMenu(), [loadMenu]);
  useEffect(() => setHighlightedIndex(0), [menuCategory, items.length]);

  const openProduct = useCallback(async (item) => {
    if (!item) return;
    try {
      const detail = await menuApi.getProduct(item.id);
      setSelectedProduct(detail);
      setSelectedOptions([]);
      setQuantity(1);
      setQtyMode(false);
    } catch (err) {
      setItemsError(err.message);
    }
  }, []);

  const selectAIProduct = useCallback((item) => {
    setScreen('menu');
    openProduct(item);
  }, [openProduct]);

  const closeProduct = useCallback(() => {
    setSelectedProduct(null);
    setSelectedOptions([]);
    setQuantity(1);
    setQtyMode(false);
  }, []);

  const addSelectedToCart = useCallback(() => {
    if (!selectedProduct) return;
    cart.addItem(selectedProduct, selectedOptions, quantity);
    closeProduct();
  }, [selectedProduct, selectedOptions, quantity, cart, closeProduct]);

  const restart = useCallback(() => {
    stopSpeech();
    window.dispatchEvent(new CustomEvent('touchbite:voice-reset'));
    cart.clearCart();
    aiApi.resetSession();
    setOrderType('Dine in');
    setOrder(null);
    setCartOpen(false);
    setCategoryMenuOpen(false);
    closeProduct();
    setAssistantResults([]);
    setAssistantSelectedIndex(0);
    setMenuCategory('Featured');
    setPayIndex(0);
    setOrderError('');
    setScreen('welcome');
  }, [cart, closeProduct]);

  const submitOrder = useCallback(
    async (methodIndex) => {
      if (submitting) return;
      setSubmitting(true);
      setOrderError('');
      try {
        const payment = PAYMENT_METHODS[methodIndex];
        const created = await orderApi.create({
          orderType,
          paymentMethod: payment.name,
          items: cart.items,
        });
        setOrder(created);
        cart.clearCart();
        setScreen('success');
      } catch (err) {
        setOrderError(err.message);
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, orderType, cart]
  );

  const mode = useMemo(
    () =>
      resolveGestureMode({
        screen,
        categoryMenuOpen,
        hasSelectedItem: Boolean(selectedProduct),
        qtyMode,
        cartOpen,
        assistantResults: assistantResults.length > 0,
      }),
    [screen, categoryMenuOpen, selectedProduct, qtyMode, cartOpen, assistantResults.length]
  );

  // Keep gesture-relevant values in refs the callback can read fresh without
  // re-creating the whole handler tree every keystroke of state — mirrors
  // McTouchKiosk keeping everything in one `state` ref.
  const liveRef = useRef({});
  liveRef.current = {
    mode,
    items,
    highlightedIndex,
    activeCatIndex,
    menuCategory,
    selectedProduct,
    selectedOptions,
    quantity,
    cart,
    assistantResults,
    assistantSelectedIndex,
    payIndex,
    orderType,
  };

  const handleIntent = useCallback(
    (intent) => {
      const s = liveRef.current;

      switch (s.mode) {
        case 'welcome': {
          if (intent === GESTURE_INTENTS.CONFIRM) setScreen('orderType');
          break;
        }

        case 'order-type': {
          if (intent === GESTURE_INTENTS.BROWSE_PREV || intent === GESTURE_INTENTS.BROWSE_NEXT) {
            setOrderType((current) => (current === 'Dine in' ? 'Takeaway' : 'Dine in'));
          }
          if (intent === GESTURE_INTENTS.CONFIRM) {
            setMenuCategory('Featured');
            setScreen('menu');
          }
          break;
        }

        case 'category-menu': {
          if (intent === GESTURE_INTENTS.CATEGORY_PREV) setActiveCatIndex((i) => Math.max(0, i - 1));
          if (intent === GESTURE_INTENTS.CATEGORY_NEXT) setActiveCatIndex((i) => Math.min(categories.length - 1, i + 1));
          if (intent === GESTURE_INTENTS.CONFIRM) {
            const nextCategory = categories[s.activeCatIndex]?.id || 'Featured';
            setMenuCategory(nextCategory);
            setCategoryMenuOpen(false);
          }
          break;
        }

        case 'browse': {
          if (intent === GESTURE_INTENTS.TOGGLE_CATEGORY_MENU) {
            const currentIndex = Math.max(0, categories.findIndex((c) => c.id === s.menuCategory));
            setActiveCatIndex(currentIndex);
            setCategoryMenuOpen(true);
          }
          if (intent === GESTURE_INTENTS.BROWSE_PREV) setHighlightedIndex((i) => Math.max(0, i - 1));
          if (intent === GESTURE_INTENTS.BROWSE_NEXT) setHighlightedIndex((i) => Math.min(Math.max(s.items.length - 1, 0), i + 1));
          if (intent === GESTURE_INTENTS.SELECT_ITEM) openProduct(s.items[s.highlightedIndex]);
          if (intent === GESTURE_INTENTS.CONFIRM) setCartOpen(true);
          break;
        }

        case 'assistant-results': {
          if (intent === GESTURE_INTENTS.BROWSE_PREV) {
            setAssistantSelectedIndex((index) => Math.max(0, index - 1));
          }
          if (intent === GESTURE_INTENTS.BROWSE_NEXT) {
            setAssistantSelectedIndex((index) => Math.min(s.assistantResults.length - 1, index + 1));
          }
          if (intent === GESTURE_INTENTS.SELECT_ITEM) {
            const product = s.assistantResults[s.assistantSelectedIndex];
            updateAssistantResults([]);
            selectAIProduct(product);
          }
          if (intent === GESTURE_INTENTS.GO_BACK || intent === GESTURE_INTENTS.CONFIRM) {
            updateAssistantResults([]);
            setAssistantSelectedIndex(0);
          }
          break;
        }

        case 'item-selected':
        case 'item-qty': {
          if (intent === GESTURE_INTENTS.TOGGLE_QTY_MODE) setQtyMode((q) => !q);
          if (intent === GESTURE_INTENTS.QTY_UP) setQuantity((q) => Math.min(20, q + 1));
          if (intent === GESTURE_INTENTS.QTY_DOWN) setQuantity((q) => Math.max(1, q - 1));
          if (intent === GESTURE_INTENTS.DESELECT_ITEM) closeProduct();
          if (intent === GESTURE_INTENTS.DROP_TO_CART) addSelectedToCart();
          if (intent === GESTURE_INTENTS.CONFIRM) {
            closeProduct();
            setCartOpen(true);
          }
          break;
        }

        case 'cart': {
          if (intent === GESTURE_INTENTS.GO_BACK) setCartOpen(false);
          if (intent === GESTURE_INTENTS.CONFIRM && s.cart.totals.count > 0) {
            setCartOpen(false);
            setScreen('checkout');
          }
          break;
        }

        case 'payment': {
          if (intent === GESTURE_INTENTS.PAYMENT_PREV) setPayIndex((i) => Math.max(0, i - 1));
          if (intent === GESTURE_INTENTS.PAYMENT_NEXT) setPayIndex((i) => Math.min(PAYMENT_METHODS.length - 1, i + 1));
          if (intent === GESTURE_INTENTS.GO_BACK) setScreen('menu');
          if (intent === GESTURE_INTENTS.CONFIRM) submitOrder(s.payIndex);
          break;
        }

        case 'success': {
          if (intent === GESTURE_INTENTS.GO_BACK) restart();
          break;
        }

        default:
          break;
      }
    },
    [openProduct, closeProduct, addSelectedToCart, restart, submitOrder, updateAssistantResults, selectAIProduct]
  );

  const gestureContext = useMemo(() => {
    if (mode === 'cart' || mode === 'browse' || mode === 'item-selected') return { canConfirm: cart.totals.count > 0 || mode !== 'cart' };
    return {};
  }, [mode, cart.totals.count]);

  const {
    videoRef,
    cameraStatus,
    cameraError,
    cursor,
    thumbProgress,
    dragActive,
    handVisible,
    retryCamera,
  } = useGestureControl({
    enabled: gestureEnabled,
    mode,
    context: gestureContext,
    onIntent: handleIntent,
  });
  const gestureStatus = {
    mode,
    cameraStatus,
    cameraError,
    videoRef,
    cursor,
    thumbProgress,
    dragActive,
    dragLabel: selectedProduct ? '🛍' : undefined,
    handVisible,
    gestureEnabled,
    onRetryCamera: retryCamera,
  };

  if (screen === 'welcome') {
    return (
      <>
        <Welcome onStart={() => setScreen('orderType')} gestureStatus={gestureStatus} cartItems={cart.items} onCartUpdate={cart.replaceItems} onAIProductSelect={selectAIProduct} assistantState={assistantState} />
        {import.meta.env.DEV && <GestureDebugOverlay status={cameraStatus} gesture={mode} confidence={0.9} fps={30} />}
      </>
    );
  }

  if (screen === 'orderType') {
    return (
      <>
        <OrderType
          selected={orderType}
          onSelect={setOrderType}
          onChoose={(choice) => {
            setOrderType(choice);
            setMenuCategory('Featured');
            setScreen('menu');
          }}
          onBack={restart}
          gestureStatus={gestureStatus}
          cartItems={cart.items}
          onCartUpdate={cart.replaceItems}
          onAIProductSelect={selectAIProduct}
          assistantState={assistantState}
        />
        {import.meta.env.DEV && <GestureDebugOverlay status={cameraStatus} gesture={mode} confidence={0.9} fps={30} />}
      </>
    );
  }

  if (screen === 'checkout') {
    return (
      <>
        <Checkout
          cart={cart}
          orderType={orderType}
          payIndex={payIndex}
          submitting={submitting}
          error={orderError}
          onBack={() => setScreen('menu')}
          onConfirm={(index, confirm) => {
            setPayIndex(index);
            if (confirm) submitOrder(index);
          }}
          gestureStatus={gestureStatus}
          onCartUpdate={cart.replaceItems}
          onAIProductSelect={selectAIProduct}
          assistantState={assistantState}
        />
        {import.meta.env.DEV && <GestureDebugOverlay status={cameraStatus} gesture={mode} confidence={0.9} fps={30} />}
      </>
    );
  }

  if (screen === 'success' && order) {
    return (
      <>
        <Success order={order} onRestart={restart} gestureStatus={gestureStatus} cartItems={cart.items} onCartUpdate={cart.replaceItems} onAIProductSelect={selectAIProduct} assistantState={assistantState} />
        {import.meta.env.DEV && <GestureDebugOverlay status={cameraStatus} gesture={mode} confidence={0.9} fps={30} />}
      </>
    );
  }

  return (
    <>
      <Menu
        items={items}
        loading={itemsLoading}
        error={itemsError}
        onRetry={loadMenu}
        highlightedIndex={highlightedIndex}
        onSelectCard={openProduct}
        activeCategory={menuCategory}
        categoryMenuOpen={categoryMenuOpen}
        activeCatIndex={activeCatIndex}
        categoryProgress={mode === 'category-menu' ? thumbProgress : 0}
        onPickCategory={(id) => {
          setMenuCategory(id);
          setCategoryMenuOpen(false);
        }}
        cartOpen={cartOpen}
        cart={cart}
        onCart={() => setCartOpen((v) => !v)}
        onHome={() => setScreen('orderType')}
        onCartClose={() => setCartOpen(false)}
        onCartCheckout={() => {
          setCartOpen(false);
          setScreen('checkout');
        }}
        selectedProduct={selectedProduct}
        quantity={quantity}
        qtyMode={qtyMode}
        selectedOptions={selectedOptions}
        dragActive={dragActive}
        onToggleOption={(option) =>
          setSelectedOptions((current) =>
            current.some((o) => o.id === option.id) ? current.filter((o) => o.id !== option.id) : [...current, option]
          )
        }
        onQuantityChange={setQuantity}
        onToggleQtyMode={() => setQtyMode((q) => !q)}
        onCloseProduct={closeProduct}
        onAddToCart={addSelectedToCart}
        onProductSelect={openProduct}
        assistantState={assistantState}
        gestureStatus={gestureStatus}
      />
      {import.meta.env.DEV && <GestureDebugOverlay status={cameraStatus} gesture={mode} confidence={0.9} fps={30} />}
    </>
  );
}
