// All of this is ported directly from the McTouchKiosk prototype's tuning —
// same cursor smoothing, same velocity thresholds (on a 0–100 cursor scale),
// same dwell-frame counts for held poses, same cooldown windows. Frame
// detection here runs at ~30fps (see detectEveryMs below) rather than a raw
// requestAnimationFrame loop, so dwell gestures land at roughly the same
// wall-clock feel (a little more deliberate, which suits a payment flow).
export const gestureConfig = {
  detectEveryMs: 34, // ~30fps hand-tracking loop
  noHandResetMs: 220,

  cursorSmoothing: 0.15,

  // Flick thresholds, in cursor-percentage-points-per-frame.
  swipeVelocity: 28, // left/right browse, category flick, payment method flick
  selectFlickVelocity: 30, // flick up to select
  deselectFlickVelocity: 35, // flick down to deselect / go back
  qtyFlickVelocity: 25, // flick up/down to change quantity

  // Absolute normalized distance between thumb tip and index tip. Two
  // thresholds give the pinch a little hysteresis — once a pinch has started
  // registering, a slightly looser distance keeps counting it, so a single
  // noisy frame near the boundary doesn't reset the hold.
  pinchDistance: 0.04,
  pinchReleaseDistance: 0.058,

  // Dwell frames required before a held pose fires.
  ringHoldFrames: 15,
  pinchHoldFrames: 10,
  thumbHoldFrames: 20,
  openPalmHoldFrames: 18,

  // When a held pose isn't detected on a given frame, its dwell counter
  // decays by this many frames rather than resetting to zero outright. Real
  // hand-tracking drops the pose for a stray frame occasionally even mid-hold
  // — a hard reset there is what makes pinch/ring/thumb holds feel flaky.
  dwellDecay: 3,

  // A swipe/flick only fires if its axis is at least this many times more
  // dominant than the other axis — stops a horizontal swipe's natural bit of
  // vertical drift from misfiring a vertical action (e.g. GO_BACK) and vice
  // versa.
  axisDominanceRatio: 1.35,

  // Cooldowns (ms) after each action fires, to stop the same held pose from
  // immediately re-triggering.
  cooldowns: {
    browse: 1000,
    select: 1200,
    deselect: 1000,
    qty: 700,
    categoryMenuToggle: 1000,
    categoryFlick: 600,
    categoryConfirm: 1500,
    pinchToggle: 1200,
    dropToCart: 1500,
    confirm: 1500,
    paymentFlick: 500,
    goBack: 1000,
    start: 1500,
  },

  // Bottom-right "drop zone" for the pinky-drag-to-cart gesture, in cursor
  // percentage coordinates (matches the cart FAB position).
  dragDropZone: { x: 75, y: 75 },
};
