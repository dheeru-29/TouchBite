import { GESTURE_TYPES } from './gestureTypes.js';

export const HAND = {
  WRIST: 0,

  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,

  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,

  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,

  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,

  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
};

const coordinate = (point, axis) => {
  if (!point) return 0;
  if (typeof point[axis] === 'number') return point[axis];
  const index = { x: 0, y: 1, z: 2 }[axis];
  return typeof point[index] === 'number' ? point[index] : 0;
};

const distance = (a, b) =>
  Math.hypot(
    coordinate(a, 'x') - coordinate(b, 'x'),
    coordinate(a, 'y') - coordinate(b, 'y'),
    coordinate(a, 'z') - coordinate(b, 'z')
  );

const average = (values) => (values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0);

/*
 * MediaPipe returns landmarks as {x, y, z} objects. Unit tests in this repo
 * use plain [x, y, z] arrays. Both are supported everywhere below via the
 * `coordinate`/`distance` helpers.
 */

// ───────────────────────────────────────────────────────────────────────────
// Raw per-frame signals — ported literally from McTouchKiosk's detect() loop.
// These are cheap boolean/positional checks evaluated on every frame; the
// gesture engine (gestureEngine.js) is what turns them into dwell-gated
// intents.
// ───────────────────────────────────────────────────────────────────────────

// Index fingertip position, mirrored, as a 0–100 cursor (matches the webcam
// being shown mirrored to the person standing in front of it).
export function getCursorPosition(hand) {
  return {
    x: (1 - coordinate(hand[HAND.INDEX_TIP], 'x')) * 100,
    y: coordinate(hand[HAND.INDEX_TIP], 'y') * 100,
  };
}

// Thumb up, other three fingers curled — the "confirm" pose.
export function isThumbUpRaw(hand) {
  return (
    coordinate(hand[HAND.THUMB_TIP], 'y') < coordinate(hand[HAND.THUMB_IP], 'y') - 0.04 &&
    coordinate(hand[HAND.INDEX_TIP], 'y') > coordinate(hand[HAND.INDEX_PIP], 'y') &&
    coordinate(hand[HAND.MIDDLE_TIP], 'y') > coordinate(hand[HAND.MIDDLE_PIP], 'y') &&
    coordinate(hand[HAND.RING_TIP], 'y') > coordinate(hand[HAND.RING_PIP], 'y')
  );
}

// Ring finger raised, index/middle down — the "open menu" pose. Deliberately
// an unusual pose so it's never thrown accidentally while browsing.
export function isRingFingerRaw(hand) {
  return (
    coordinate(hand[HAND.RING_TIP], 'y') < coordinate(hand[HAND.RING_PIP], 'y') - 0.05 &&
    coordinate(hand[HAND.INDEX_TIP], 'y') > coordinate(hand[HAND.INDEX_PIP], 'y') &&
    coordinate(hand[HAND.MIDDLE_TIP], 'y') > coordinate(hand[HAND.MIDDLE_PIP], 'y')
  );
}

// Thumb tip and index tip close together — the "quantity mode" pose.
export function isPinchingRaw(hand, pinchDistance = 0.04) {
  return distance(hand[HAND.THUMB_TIP], hand[HAND.INDEX_TIP]) < pinchDistance;
}

// Pinky raised, index down — the "pick up the item" pose used while dragging
// a selected item to the cart.
export function isPinkyRaw(hand) {
  return (
    coordinate(hand[HAND.PINKY_TIP], 'y') < coordinate(hand[HAND.PINKY_PIP], 'y') - 0.05 &&
    coordinate(hand[HAND.INDEX_TIP], 'y') > coordinate(hand[HAND.INDEX_PIP], 'y')
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Static pose classification, used only for the welcome/success screens
// (open palm to start / restart) where we want a simple named pose rather
// than a full intent.
// ───────────────────────────────────────────────────────────────────────────

const isFingerExtended = (landmarks, pip, dip, tip) => {
  const wrist = landmarks[HAND.WRIST];
  const pipDistance = distance(landmarks[pip], wrist);
  const dipDistance = distance(landmarks[dip], wrist);
  const tipDistance = distance(landmarks[tip], wrist);
  return tipDistance > pipDistance * 1.18 && tipDistance > dipDistance * 1.08;
};

export function classifyHandGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) {
    return { type: GESTURE_TYPES.NONE, confidence: 0 };
  }

  const isArrayFormat = Array.isArray(landmarks[0]);

  if (isArrayFormat) {
    // Legacy array-based synthetic landmarks, kept for the existing test
    // fixtures (buildOpenPalmLandmarks / buildFistLandmarks / etc.).
    const wrist = landmarks[HAND.WRIST];
    const fingerTips = [
      distance(landmarks[HAND.INDEX_TIP], wrist),
      distance(landmarks[HAND.MIDDLE_TIP], wrist),
      distance(landmarks[HAND.RING_TIP], wrist),
      distance(landmarks[HAND.PINKY_TIP], wrist),
    ];
    const fingerTipAverage = average(fingerTips);
    const thumbTipDistance = distance(landmarks[HAND.THUMB_TIP], wrist);
    const thumbIndexDistance = distance(landmarks[HAND.THUMB_TIP], landmarks[HAND.INDEX_TIP]);
    const fingerSpread = distance(landmarks[HAND.INDEX_TIP], landmarks[HAND.PINKY_TIP]);

    const openPalm = fingerTipAverage > 0.38 && thumbTipDistance > 0.38 && fingerSpread > 0.2;
    const fist = fingerTipAverage < 0.32 && thumbTipDistance < 0.34 && thumbIndexDistance < 0.09;
    const pinch = fingerTipAverage > 0.32 && thumbTipDistance < 0.45 && thumbIndexDistance < 0.11 && fingerSpread < 0.2;
    const thumbsUp = thumbTipDistance > 0.38 && fingerTipAverage < 0.33 && thumbIndexDistance > 0.16 && fingerSpread < 0.18;

    if (pinch) return { type: GESTURE_TYPES.PINCH, confidence: 0.9 };
    if (thumbsUp) return { type: GESTURE_TYPES.THUMBS_UP, confidence: 0.9 };
    if (fist) return { type: GESTURE_TYPES.FIST, confidence: 0.9 };
    if (openPalm) return { type: GESTURE_TYPES.OPEN_PALM, confidence: 0.9 };
    return { type: GESTURE_TYPES.NONE, confidence: 0 };
  }

  // Real MediaPipe landmarks.
  const indexExtended = isFingerExtended(landmarks, HAND.INDEX_PIP, HAND.INDEX_DIP, HAND.INDEX_TIP);
  const middleExtended = isFingerExtended(landmarks, HAND.MIDDLE_PIP, HAND.MIDDLE_DIP, HAND.MIDDLE_TIP);
  const ringExtended = isFingerExtended(landmarks, HAND.RING_PIP, HAND.RING_DIP, HAND.RING_TIP);
  const pinkyExtended = isFingerExtended(landmarks, HAND.PINKY_PIP, HAND.PINKY_DIP, HAND.PINKY_TIP);
  const extendedCount = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;

  const thumbTip = landmarks[HAND.THUMB_TIP];
  const thumbIP = landmarks[HAND.THUMB_IP];
  const wrist = landmarks[HAND.WRIST];
  const thumbExtended = distance(thumbTip, wrist) > distance(thumbIP, wrist) * 1.12;

  const openPalm = extendedCount >= 4 && thumbExtended;
  const fist = extendedCount === 0 && !isPinchingRaw(landmarks) && !isThumbUpRaw(landmarks);

  if (isThumbUpRaw(landmarks)) return { type: GESTURE_TYPES.THUMBS_UP, confidence: 0.92 };
  if (fist) return { type: GESTURE_TYPES.FIST, confidence: 0.9 };
  if (openPalm) return { type: GESTURE_TYPES.OPEN_PALM, confidence: 0.95 };

  return { type: GESTURE_TYPES.NONE, confidence: 0 };
}

/*
 * ---------------------------------------------------------
 * TEST LANDMARK BUILDERS
 * ---------------------------------------------------------
 */

export function buildOpenPalmLandmarks() {
  return [
    [0.0, 0.0, 0], [0.04, 0.16, 0], [0.10, 0.24, 0], [0.16, 0.32, 0], [0.20, 0.44, 0],
    [0.11, 0.12, 0], [0.18, 0.20, 0], [0.24, 0.30, 0], [0.29, 0.40, 0],
    [0.15, 0.08, 0], [0.23, 0.12, 0], [0.28, 0.20, 0], [0.33, 0.30, 0],
    [0.18, 0.06, 0], [0.25, 0.10, 0], [0.30, 0.18, 0], [0.35, 0.28, 0],
    [0.22, 0.03, 0], [0.28, 0.05, 0], [0.32, 0.12, 0], [0.36, 0.20, 0],
  ];
}

export function buildFistLandmarks() {
  return [
    [0.0, 0.0, 0], [0.08, 0.08, 0], [0.09, 0.15, 0], [0.10, 0.20, 0], [0.12, 0.27, 0],
    [0.10, 0.10, 0], [0.13, 0.14, 0], [0.14, 0.18, 0], [0.15, 0.21, 0],
    [0.14, 0.11, 0], [0.18, 0.15, 0], [0.19, 0.19, 0], [0.20, 0.22, 0],
    [0.18, 0.11, 0], [0.23, 0.15, 0], [0.24, 0.19, 0], [0.25, 0.22, 0],
    [0.22, 0.10, 0], [0.25, 0.14, 0], [0.26, 0.18, 0], [0.27, 0.21, 0],
  ];
}

export function buildThumbsUpLandmarks() {
  return [
    [0.0, 0.0, 0], [0.08, 0.05, 0], [0.11, 0.12, 0], [0.14, 0.26, 0], [0.20, 0.42, 0],
    [0.12, 0.10, 0], [0.16, 0.15, 0], [0.17, 0.18, 0], [0.17, 0.20, 0],
    [0.18, 0.08, 0], [0.20, 0.11, 0], [0.21, 0.13, 0], [0.22, 0.15, 0],
    [0.22, 0.08, 0], [0.24, 0.10, 0], [0.25, 0.12, 0], [0.25, 0.15, 0],
    [0.26, 0.07, 0], [0.27, 0.09, 0], [0.28, 0.12, 0], [0.29, 0.15, 0],
  ];
}

export function buildPinchLandmarks() {
  return [
    [0.0, 0.0, 0], [0.08, 0.10, 0], [0.11, 0.15, 0], [0.12, 0.23, 0], [0.18, 0.34, 0],
    [0.10, 0.12, 0], [0.17, 0.17, 0], [0.20, 0.23, 0], [0.24, 0.28, 0],
    [0.18, 0.12, 0], [0.24, 0.16, 0], [0.29, 0.20, 0], [0.33, 0.25, 0],
    [0.24, 0.12, 0], [0.30, 0.15, 0], [0.35, 0.18, 0], [0.40, 0.22, 0],
    [0.27, 0.11, 0], [0.32, 0.13, 0], [0.36, 0.15, 0], [0.39, 0.17, 0],
  ];
}
