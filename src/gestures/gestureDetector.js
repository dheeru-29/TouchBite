import { gestureConfig } from './gestureConfig.js';
import { GESTURE_TYPES } from './gestureTypes.js';
import { classifyHandGesture } from './gestureClassifier.js';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const coordinate = (point, axis) => point?.[axis] ?? point?.[{ x: 0, y: 1, z: 2 }[axis]] ?? 0;

export function createGestureDetector() {
  const detector = {
    lastStableType: GESTURE_TYPES.NONE,
    lastStableAt: 0,
    lastEventAt: -Infinity,
    staticGestureFired: false,
    swipeHistory: [],
    lastSwipeAt: -Infinity,
    smoothX: null,
    smoothY: null,
    prevX: null,
    prevY: null,
  };

  detector.resetTransientState = () => {
    detector.lastStableType = GESTURE_TYPES.NONE;
    detector.lastStableAt = performance.now();
    detector.staticGestureFired = false;
    detector.swipeHistory = [];
    detector.smoothX = null;
    detector.smoothY = null;
    detector.prevX = null;
    detector.prevY = null;
  };

  return detector;
}

function updateSmoothedPosition(detector, landmarks) {
  const tip = landmarks[8];
  const rawX = 1 - coordinate(tip, 'x');
  const rawY = coordinate(tip, 'y');
  const smoothing = 0.28;

  if (detector.smoothX === null) {
    detector.smoothX = rawX;
    detector.smoothY = rawY;
    detector.prevX = rawX;
    detector.prevY = rawY;
  }

  detector.smoothX += (rawX - detector.smoothX) * smoothing;
  detector.smoothY += (rawY - detector.smoothY) * smoothing;

  const velocity = {
    x: detector.smoothX - detector.prevX,
    y: detector.smoothY - detector.prevY,
  };

  detector.prevX = detector.smoothX;
  detector.prevY = detector.smoothY;
  return velocity;
}

export function detectGesture(detector, landmarks, now) {
  if (!landmarks || landmarks.length < 21) {
    detector.resetTransientState();
    return null;
  }

  const staticGesture = classifyHandGesture(landmarks);
  updateSmoothedPosition(detector, landmarks);

  // Keep a short movement window. This is deliberately based on normalized
  // landmark coordinates, so it works across camera resolutions and distances.
  detector.swipeHistory.push({ x: detector.smoothX, y: detector.smoothY, t: now });
  if (detector.swipeHistory.length > gestureConfig.handHistorySize) detector.swipeHistory.shift();

  if (detector.swipeHistory.length >= 3 && now - detector.lastSwipeAt >= gestureConfig.swipeCooldownMs) {
    const first = detector.swipeHistory[0];
    const last = detector.swipeHistory[detector.swipeHistory.length - 1];
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const elapsed = Math.max(last.t - first.t, 1);
    const horizontal = Math.abs(dx) >= Math.abs(dy);
    const distance = horizontal ? Math.abs(dx) : Math.abs(dy);
    const velocity = distance / elapsed;

    if (distance >= gestureConfig.minSwipeDistance && velocity >= gestureConfig.minSwipeVelocity) {
      detector.lastSwipeAt = now;
      detector.lastEventAt = now;
      detector.swipeHistory = [];
      // Force the next static gesture to be re-established after a swipe.
      detector.lastStableType = GESTURE_TYPES.NONE;
      detector.staticGestureFired = false;

      return {
        type: horizontal
          ? (dx < 0 ? GESTURE_TYPES.SWIPE_LEFT : GESTURE_TYPES.SWIPE_RIGHT)
          : (dy < 0 ? GESTURE_TYPES.SWIPE_UP : GESTURE_TYPES.SWIPE_DOWN),
        confidence: clamp(distance / 0.28, 0.55, 1),
      };
    }
  }

  // Static gestures (open palm / thumbs up / etc.) must be held continuously.
  // A gesture can fire once, then must disappear/re-enter before firing again.
  if (staticGesture.type !== GESTURE_TYPES.NONE) {
    if (staticGesture.type !== detector.lastStableType) {
      detector.lastStableType = staticGesture.type;
      detector.lastStableAt = now;
      detector.staticGestureFired = false;
      return null;
    }

    const heldFor = now - detector.lastStableAt;
    const cooledDown = now - detector.lastEventAt >= gestureConfig.staticGestureCooldownMs;

    if (heldFor >= gestureConfig.staticGestureHoldMs && cooledDown && !detector.staticGestureFired) {
      detector.lastEventAt = now;
      detector.staticGestureFired = true;
      return staticGesture;
    }
  } else {
    detector.lastStableType = GESTURE_TYPES.NONE;
    detector.lastStableAt = now;
    detector.staticGestureFired = false;
  }

  return null;
}
