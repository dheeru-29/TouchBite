// Raw static hand poses we can read on any given frame. These back the
// welcome/success "open palm" moments and feed the ring/pinch/pinky/thumb
// checks used everywhere else.
export const GESTURE_TYPES = {
  NONE: 'NONE',
  OPEN_PALM: 'OPEN_PALM',
  FIST: 'FIST',
  THUMBS_UP: 'THUMBS_UP',
  PINCH: 'PINCH',
};

// Intents are the *interpreted* output of the gesture engine for the current
// screen mode — this is the McTouchKiosk model: a single per-frame loop reads
// raw landmarks (fingertip position, thumb/ring/pinky pose, pinch distance)
// and turns them into one deliberate intent at a time, gated by dwell frames
// and cooldowns so nothing fires on a single noisy frame.
export const GESTURE_INTENTS = {
  // Ring finger held ~0.5s — opens/closes the category menu overlay.
  TOGGLE_CATEGORY_MENU: 'TOGGLE_CATEGORY_MENU',
  // Inside the category overlay: flick up/down to move the highlight.
  CATEGORY_PREV: 'CATEGORY_PREV',
  CATEGORY_NEXT: 'CATEGORY_NEXT',

  // Browsing the item carousel: swipe left/right to move between items.
  BROWSE_PREV: 'BROWSE_PREV',
  BROWSE_NEXT: 'BROWSE_NEXT',
  // Flick up to lock in / open the highlighted item.
  SELECT_ITEM: 'SELECT_ITEM',
  // Flick down (when not dragging) to back out of the open item.
  DESELECT_ITEM: 'DESELECT_ITEM',

  // Pinch-hold toggles quantity mode on the open item.
  TOGGLE_QTY_MODE: 'TOGGLE_QTY_MODE',
  QTY_UP: 'QTY_UP',
  QTY_DOWN: 'QTY_DOWN',

  // Pinky raised + dragged to the cart corner = add to cart.
  DRAG_START: 'DRAG_START',
  DROP_TO_CART: 'DROP_TO_CART',

  // Payment method carousel.
  PAYMENT_PREV: 'PAYMENT_PREV',
  PAYMENT_NEXT: 'PAYMENT_NEXT',

  // Thumbs-up held ~0.6s = "confirm/advance". Fired continuously as
  // CONFIRM_PROGRESS while building up (drives a progress ring in the UI),
  // then once as CONFIRM when it completes.
  CONFIRM_PROGRESS: 'CONFIRM_PROGRESS',
  CONFIRM: 'CONFIRM',

  // Swipe down = universal "back/close" gesture.
  GO_BACK: 'GO_BACK',
};
