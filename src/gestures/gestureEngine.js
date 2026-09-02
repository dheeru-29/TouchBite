import { gestureConfig } from './gestureConfig.js';
import { GESTURE_INTENTS, GESTURE_TYPES } from './gestureTypes.js';
import { classifyHandGesture, getCursorPosition, isThumbUpRaw, isRingFingerRaw, isPinchingRaw, isPinkyRaw } from './gestureClassifier.js';

/*
 * This is the McTouchKiosk interaction model, generalized so any screen can
 * use it: one function reads the current hand landmarks + the screen's
 * current "mode" and returns the (at most one, usually zero) intent that
 * should fire this frame — plus continuous UI state (cursor position, a
 * thumb-hold progress percentage, and whether a drag is in flight) so the
 * screen can render a progress ring / drag ghost the way McTouchKiosk did.
 *
 * Modes:
 *  welcome        — open-palm hold to start
 *  order-type     — swipe to toggle dine-in/takeaway, thumb-hold to confirm
 *  category-menu  — flick up/down to browse categories, thumb-hold to confirm
 *  browse         — ring finger opens the category menu, swipe left/right to
 *                    browse items, flick up to select, thumb-hold to open cart
 *  item-selected  — pinch-hold toggles quantity mode, pinky-drag-to-corner
 *                    adds to cart, flick down deselects, thumb-hold opens cart
 *  item-qty       — flick up/down changes quantity, pinch-hold exits
 *  cart           — thumb-hold proceeds to payment, flick down goes back
 *  payment        — swipe left/right changes method, thumb-hold pays,
 *                    flick down goes back
 *  success        — flick down restarts
 */

export function createEngineState() {
  return {
    smoothX: null,
    smoothY: null,
    prevX: 50,
    prevY: 50,
    ringFrames: 0,
    pinchFrames: 0,
    thumbFrames: 0,
    openPalmFrames: 0,
    dragActive: false,
    cooldownUntil: 0,
  };
}

export function resetEngineState(state) {
  state.ringFrames = 0;
  state.pinchFrames = 0;
  state.thumbFrames = 0;
  state.openPalmFrames = 0;
  state.dragActive = false;
  // smoothX/Y and cooldownUntil deliberately kept — avoids a cursor jump and
  // avoids re-arming a gesture the instant the hand re-enters frame.
}

export function stepGestureEngine(state, hand, mode, now, context = {}) {
  const cfg = gestureConfig;
  const raw = getCursorPosition(hand);

  if (state.smoothX === null) {
    state.smoothX = raw.x;
    state.smoothY = raw.y;
    state.prevX = raw.x;
    state.prevY = raw.y;
  }

  // Velocity is frame-to-frame *raw* fingertip movement — this is what
  // McTouchKiosk flicks off of, since a real flick is a genuine jump in
  // physical hand position between two ~34ms samples. Smoothing is applied
  // separately and only drives the cursor/drag-ghost shown in the UI, so it
  // never blunts gesture responsiveness.
  const velX = raw.x - state.prevX;
  const velY = raw.y - state.prevY;
  state.prevX = raw.x;
  state.prevY = raw.y;

  state.smoothX += (raw.x - state.smoothX) * cfg.cursorSmoothing;
  state.smoothY += (raw.y - state.smoothY) * cfg.cursorSmoothing;

  const thumbUp = isThumbUpRaw(hand);
  const ring = isRingFingerRaw(hand);
  // Pinch has hysteresis: a tighter distance is needed to *start* a hold, but
  // once frames are already accumulating, a slightly looser distance keeps it
  // going — this stops a single noisy frame right at the boundary from
  // wiping out an otherwise-good hold.
  const pinching = isPinchingRaw(hand, state.pinchFrames > 0 ? cfg.pinchReleaseDistance : cfg.pinchDistance);
  const pinky = isPinkyRaw(hand);

  // Which axis is actually dominant this frame — used to stop a mostly-
  // horizontal swipe's incidental vertical drift (or vice versa) from
  // misfiring the other axis's gesture.
  const absX = Math.abs(velX);
  const absY = Math.abs(velY);
  const horizontalDominant = absX > absY * cfg.axisDominanceRatio;
  const verticalDominant = absY > absX * cfg.axisDominanceRatio;

  const result = {
    intents: [],
    cursor: { x: state.smoothX, y: state.smoothY },
    thumbProgress: 0,
    dragActive: state.dragActive,
  };

  const cooling = now < state.cooldownUntil;
  const fire = (intent, cooldownMs) => {
    result.intents.push(intent);
    state.cooldownUntil = now + cooldownMs;
  };
  const decay = (frames) => Math.max(0, frames - cfg.dwellDecay);

  // Ring finger opens/closes the category menu from either side of it.
  if (!cooling && (mode === 'browse' || mode === 'category-menu')) {
    if (ring) {
      state.ringFrames++;
      if (state.ringFrames === cfg.ringHoldFrames) {
        fire(GESTURE_INTENTS.TOGGLE_CATEGORY_MENU, cfg.cooldowns.categoryMenuToggle);
        state.ringFrames = 0;
      }
    } else {
      state.ringFrames = decay(state.ringFrames);
    }
  } else if (mode !== 'browse' && mode !== 'category-menu') {
    state.ringFrames = 0;
  }

  // A thumb-hold "confirm" is available on several modes. Each call site
  // supplies its own cooldown key + whether confirming is currently allowed
  // (e.g. an empty cart shouldn't let you check out).
  const thumbHold = (cooldownMs, allowed = true) => {
    if (!thumbUp) {
      state.thumbFrames = decay(state.thumbFrames);
      result.thumbProgress = Math.min((state.thumbFrames / cfg.thumbHoldFrames) * 100, 100);
      return false;
    }
    if (!allowed) return false;
    state.thumbFrames++;
    result.thumbProgress = Math.min((state.thumbFrames / cfg.thumbHoldFrames) * 100, 100);
    if (!cooling && state.thumbFrames === cfg.thumbHoldFrames) {
      fire(GESTURE_INTENTS.CONFIRM, cooldownMs);
      state.thumbFrames = 0;
      result.thumbProgress = 0;
      return true;
    }
    return false;
  };

  if (!cooling) {
    switch (mode) {
      case 'welcome': {
        const { type } = classifyHandGesture(hand);
        if (type === GESTURE_TYPES.OPEN_PALM) {
          state.openPalmFrames++;
          result.thumbProgress = Math.min((state.openPalmFrames / cfg.openPalmHoldFrames) * 100, 100);
          if (state.openPalmFrames === cfg.openPalmHoldFrames) {
            fire(GESTURE_INTENTS.CONFIRM, cfg.cooldowns.start);
            state.openPalmFrames = 0;
          }
        } else {
          state.openPalmFrames = 0;
          result.thumbProgress = 0;
        }
        break;
      }

      case 'order-type': {
        if (horizontalDominant && velX > cfg.swipeVelocity) fire(GESTURE_INTENTS.BROWSE_NEXT, cfg.cooldowns.browse);
        else if (horizontalDominant && velX < -cfg.swipeVelocity) fire(GESTURE_INTENTS.BROWSE_PREV, cfg.cooldowns.browse);
        else thumbHold(cfg.cooldowns.confirm);
        break;
      }

      case 'category-menu': {
        if (verticalDominant && velY < -cfg.swipeVelocity) fire(GESTURE_INTENTS.CATEGORY_PREV, cfg.cooldowns.categoryFlick);
        else if (verticalDominant && velY > cfg.swipeVelocity) fire(GESTURE_INTENTS.CATEGORY_NEXT, cfg.cooldowns.categoryFlick);
        else thumbHold(cfg.cooldowns.categoryConfirm);
        break;
      }

      case 'browse': {
        if (horizontalDominant && velX > cfg.swipeVelocity) fire(GESTURE_INTENTS.BROWSE_NEXT, cfg.cooldowns.browse);
        else if (horizontalDominant && velX < -cfg.swipeVelocity) fire(GESTURE_INTENTS.BROWSE_PREV, cfg.cooldowns.browse);
        else if (verticalDominant && velY < -cfg.selectFlickVelocity) fire(GESTURE_INTENTS.SELECT_ITEM, cfg.cooldowns.select);
        else thumbHold(cfg.cooldowns.confirm, context.canConfirm !== false);
        break;
      }

      case 'item-selected': {
        if (pinching && !state.dragActive) {
          state.pinchFrames++;
          if (state.pinchFrames === cfg.pinchHoldFrames) {
            fire(GESTURE_INTENTS.TOGGLE_QTY_MODE, cfg.cooldowns.pinchToggle);
            state.pinchFrames = 0;
          }
        } else {
          state.pinchFrames = decay(state.pinchFrames);
        }

        if (pinky) state.dragActive = true;
        result.dragActive = state.dragActive;

        if (
          state.dragActive &&
          raw.x > cfg.dragDropZone.x &&
          raw.y > cfg.dragDropZone.y &&
          coordinateBelow(hand)
        ) {
          fire(GESTURE_INTENTS.DROP_TO_CART, cfg.cooldowns.dropToCart);
          state.dragActive = false;
          result.dragActive = false;
        } else if (!state.dragActive && verticalDominant && velY > cfg.deselectFlickVelocity) {
          fire(GESTURE_INTENTS.DESELECT_ITEM, cfg.cooldowns.deselect);
        } else if (!state.dragActive) {
          thumbHold(cfg.cooldowns.confirm, context.canConfirm !== false);
        }
        break;
      }

      case 'item-qty': {
        if (pinching) {
          state.pinchFrames++;
          if (state.pinchFrames === cfg.pinchHoldFrames) {
            fire(GESTURE_INTENTS.TOGGLE_QTY_MODE, cfg.cooldowns.pinchToggle);
            state.pinchFrames = 0;
          }
        } else {
          state.pinchFrames = decay(state.pinchFrames);
        }

        if (verticalDominant && velY < -cfg.qtyFlickVelocity) fire(GESTURE_INTENTS.QTY_UP, cfg.cooldowns.qty);
        else if (verticalDominant && velY > cfg.qtyFlickVelocity) fire(GESTURE_INTENTS.QTY_DOWN, cfg.cooldowns.qty);
        break;
      }

      case 'cart': {
        if (verticalDominant && velY > cfg.deselectFlickVelocity) fire(GESTURE_INTENTS.GO_BACK, cfg.cooldowns.goBack);
        else thumbHold(cfg.cooldowns.confirm, context.canConfirm !== false);
        break;
      }

      case 'payment': {
        if (horizontalDominant && velX > cfg.swipeVelocity) fire(GESTURE_INTENTS.PAYMENT_NEXT, cfg.cooldowns.paymentFlick);
        else if (horizontalDominant && velX < -cfg.swipeVelocity) fire(GESTURE_INTENTS.PAYMENT_PREV, cfg.cooldowns.paymentFlick);
        else if (verticalDominant && velY > cfg.deselectFlickVelocity) fire(GESTURE_INTENTS.GO_BACK, cfg.cooldowns.goBack);
        else thumbHold(cfg.cooldowns.confirm);
        break;
      }

      case 'success': {
        if (verticalDominant && velY > cfg.deselectFlickVelocity) fire(GESTURE_INTENTS.GO_BACK, cfg.cooldowns.goBack);
        break;
      }

      default:
        break;
    }
  }

  return result;
}

// McTouchKiosk's drop check requires the index tip to be above the index PIP
// joint (i.e. the hand is held up, not resting) — a small extra guard so a
// hand merely passing through the corner doesn't drop the item accidentally.
function coordinateBelow(hand) {
  const y8 = hand[8]?.y ?? (Array.isArray(hand[8]) ? hand[8][1] : 0);
  const y6 = hand[6]?.y ?? (Array.isArray(hand[6]) ? hand[6][1] : 0);
  return y8 < y6;
}
