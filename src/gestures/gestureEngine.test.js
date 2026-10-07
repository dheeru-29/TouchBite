import test from 'node:test';
import assert from 'node:assert/strict';
import { createEngineState, stepGestureEngine } from './gestureEngine.js';
import { resolveGestureMode } from './gestureController.js';

// Minimal synthetic hand: an object keyed by MediaPipe landmark index, each
// {x,y,z}. Helper builds a neutral hand we mutate per-test.
function neutralHand() {
  const hand = new Array(21).fill(null).map(() => ({ x: 0.5, y: 0.5, z: 0 }));
  hand[0] = { x: 0.5, y: 0.7, z: 0 }; // wrist
  hand[4] = { x: 0.42, y: 0.5, z: 0 }; // thumb tip
  hand[3] = { x: 0.4, y: 0.55, z: 0 }; // thumb ip
  hand[8] = { x: 0.5, y: 0.4, z: 0 }; // index tip
  hand[6] = { x: 0.5, y: 0.5, z: 0 }; // index pip (curled: tip.y < pip.y means extended)
  hand[12] = { x: 0.55, y: 0.55, z: 0 }; // middle tip (curled)
  hand[10] = { x: 0.55, y: 0.5, z: 0 }; // middle pip
  hand[16] = { x: 0.6, y: 0.55, z: 0 }; // ring tip (curled)
  hand[14] = { x: 0.6, y: 0.5, z: 0 }; // ring pip
  hand[20] = { x: 0.65, y: 0.55, z: 0 }; // pinky tip (curled)
  hand[18] = { x: 0.65, y: 0.5, z: 0 }; // pinky pip
  return hand;
}

function withIndexAt(hand, x, y = 0.4) {
  return hand.map((point, i) => (i === 8 ? { ...point, x, y } : point));
}

// Velocity is a genuine frame-to-frame raw-position delta (see gestureEngine
// comments), so a real flick shows up as one big jump between consecutive
// ~34ms samples — exactly how a fast physical hand sweep would land on a
// ~30fps detector, not a gradual multi-frame ramp.
function flick(state, hand, mode, now, x) {
  return stepGestureEngine(state, withIndexAt(hand, x), mode, now);
}

test('browse: a fast flick fires a browse intent after crossing the velocity threshold', () => {
  const state = createEngineState();
  const hand = neutralHand();
  let now = 0;
  stepGestureEngine(state, withIndexAt(hand, 0.5), 'browse', (now += 34));
  const result = flick(state, hand, 'browse', (now += 34), 0.05);
  assert.ok(result.intents.length > 0, 'expected a browse intent to fire on a hard flick');
});

test('browse: flicking up selects the highlighted item', () => {
  const state = createEngineState();
  const hand = neutralHand();
  let now = 0;
  stepGestureEngine(state, hand, 'browse', (now += 34));
  const movedUp = hand.map((point, idx) => (idx === 8 ? { ...point, y: point.y - 0.4 } : point));
  const result = stepGestureEngine(state, movedUp, 'browse', (now += 34));
  assert.ok(result.intents.includes('SELECT_ITEM'));
});

test('assistant results: swipe browses results and flick up selects the highlighted result', () => {
  const state = createEngineState();
  const hand = neutralHand();
  let now = 0;
  stepGestureEngine(state, withIndexAt(hand, 0.5), 'assistant-results', (now += 34));
  const swipe = stepGestureEngine(state, withIndexAt(hand, 0.05), 'assistant-results', (now += 34));
  assert.ok(swipe.intents.includes('BROWSE_NEXT'));

  const selectState = createEngineState();
  stepGestureEngine(selectState, hand, 'assistant-results', 34);
  const movedUp = hand.map((point, idx) => (idx === 8 ? { ...point, y: point.y - 0.4 } : point));
  const selection = stepGestureEngine(selectState, movedUp, 'assistant-results', 68);
  assert.ok(selection.intents.includes('SELECT_ITEM'));
});

test('assistant results: flicking down dismisses the results panel', () => {
  const state = createEngineState();
  const hand = neutralHand();
  stepGestureEngine(state, hand, 'assistant-results', 34);
  const movedDown = hand.map((point, idx) => (idx === 8 ? { ...point, y: point.y + 0.45 } : point));
  const result = stepGestureEngine(state, movedDown, 'assistant-results', 68);
  assert.ok(result.intents.includes('GO_BACK'));
});

test('assistant result mode temporarily overrides the menu and restores the normal mode when dismissed', () => {
  assert.equal(resolveGestureMode({
    screen: 'menu',
    categoryMenuOpen: false,
    hasSelectedItem: false,
    qtyMode: false,
    cartOpen: false,
    assistantResults: true,
  }), 'assistant-results');

  assert.equal(resolveGestureMode({
    screen: 'menu',
    categoryMenuOpen: false,
    hasSelectedItem: false,
    qtyMode: false,
    cartOpen: false,
    assistantResults: false,
  }), 'browse');
});

test('ring finger held for the dwell period opens the category menu', () => {
  const state = createEngineState();
  const hand = neutralHand();
  // Ring-raised pose: index and middle curled down, ring tip up.
  hand[8] = { x: 0.5, y: 0.6, z: 0 };
  hand[6] = { x: 0.5, y: 0.5, z: 0 };
  hand[12] = { x: 0.55, y: 0.6, z: 0 };
  hand[10] = { x: 0.55, y: 0.5, z: 0 };
  hand[16] = { x: 0.6, y: 0.3, z: 0 }; // ring tip raised above pip
  hand[14] = { x: 0.6, y: 0.5, z: 0 };
  let now = 0;
  let fired = false;
  for (let i = 0; i < 20; i += 1) {
    const result = stepGestureEngine(state, hand, 'browse', (now += 34));
    if (result.intents.includes('TOGGLE_CATEGORY_MENU')) fired = true;
  }
  assert.ok(fired, 'expected TOGGLE_CATEGORY_MENU to fire once the ring-finger dwell threshold is reached');
});

test('pinch held on a selected item toggles quantity mode', () => {
  const state = createEngineState();
  const hand = neutralHand();
  hand[4] = { x: 0.5, y: 0.4, z: 0 }; // thumb tip
  hand[8] = { x: 0.505, y: 0.4, z: 0 }; // index tip, very close to thumb tip -> pinching
  let now = 0;
  let fired = false;
  for (let i = 0; i < 15; i += 1) {
    const result = stepGestureEngine(state, hand, 'item-selected', (now += 34));
    if (result.intents.includes('TOGGLE_QTY_MODE')) fired = true;
  }
  assert.ok(fired);
});

test('thumb-hold builds progress and fires CONFIRM once complete', () => {
  const state = createEngineState();
  const hand = neutralHand();
  // Thumb up pose: thumb tip well above thumb ip, other fingers curled (tip.y > pip.y).
  hand[4] = { x: 0.4, y: 0.2, z: 0 };
  hand[3] = { x: 0.4, y: 0.5, z: 0 };
  hand[8] = { x: 0.5, y: 0.6, z: 0 };
  hand[6] = { x: 0.5, y: 0.5, z: 0 };
  hand[12] = { x: 0.55, y: 0.6, z: 0 };
  hand[10] = { x: 0.55, y: 0.5, z: 0 };
  hand[16] = { x: 0.6, y: 0.6, z: 0 };
  hand[14] = { x: 0.6, y: 0.5, z: 0 };

  let now = 0;
  let confirmed = false;
  let sawProgress = false;
  for (let i = 0; i < 25; i += 1) {
    const result = stepGestureEngine(state, hand, 'browse', (now += 34));
    if (result.thumbProgress > 0 && result.thumbProgress < 100) sawProgress = true;
    if (result.intents.includes('CONFIRM')) confirmed = true;
  }
  assert.ok(sawProgress, 'expected an in-progress thumbProgress value while holding the pose');
  assert.ok(confirmed, 'expected CONFIRM to fire once the hold threshold is reached');
});

test('a mostly-horizontal swipe with incidental vertical drift does not misfire GO_BACK', () => {
  const state = createEngineState();
  const hand = neutralHand();
  let now = 0;
  stepGestureEngine(state, hand, 'payment', (now += 34));
  // Big horizontal jump with some vertical drift too, but horizontal clearly dominant.
  const moved = hand.map((point, idx) => (idx === 8 ? { ...point, x: 0.05, y: point.y + 0.05 } : point));
  const result = stepGestureEngine(state, moved, 'payment', (now += 34));
  assert.ok(!result.intents.includes('GO_BACK'), 'a dominantly-horizontal swipe should not trigger the vertical GO_BACK gesture');
  assert.ok(result.intents.includes('PAYMENT_NEXT') || result.intents.includes('PAYMENT_PREV'));
});

test('a genuine downward swipe still fires GO_BACK when vertical is dominant', () => {
  const state = createEngineState();
  const hand = neutralHand();
  let now = 0;
  stepGestureEngine(state, hand, 'payment', (now += 34));
  const moved = hand.map((point, idx) => (idx === 8 ? { ...point, y: point.y + 0.45 } : point));
  const result = stepGestureEngine(state, moved, 'payment', (now += 34));
  assert.ok(result.intents.includes('GO_BACK'));
});

test('pinch hysteresis: a single noisy frame near the boundary does not reset an in-progress hold', () => {
  const state = createEngineState();
  const hand = neutralHand();
  hand[4] = { x: 0.5, y: 0.4, z: 0 };
  hand[8] = { x: 0.506, y: 0.4, z: 0 }; // distance ~0.006, well inside the tight engage threshold
  let now = 0;
  // Build up a few frames of real pinch first.
  for (let i = 0; i < 6; i += 1) stepGestureEngine(state, hand, 'item-selected', (now += 34));
  assert.ok(state.pinchFrames > 0, 'expected pinch progress to have accumulated');

  // One noisy frame where the distance briefly opens past the tight (engage)
  // threshold but stays under the looser release threshold.
  const noisyHand = hand.map((point, idx) => (idx === 8 ? { ...point, x: 0.548 } : point)); // distance ~0.048
  stepGestureEngine(state, noisyHand, 'item-selected', (now += 34));
  assert.ok(state.pinchFrames > 0, 'a single boundary-noise frame should not fully reset an in-progress pinch hold');

  // And it should still be able to complete from here.
  let fired = false;
  for (let i = 0; i < 10; i += 1) {
    const result = stepGestureEngine(state, hand, 'item-selected', (now += 34));
    if (result.intents.includes('TOGGLE_QTY_MODE')) fired = true;
  }
  assert.ok(fired);
});

test('cooldown blocks an immediate repeat of the same action', () => {
  const state = createEngineState();
  const hand = neutralHand();
  let now = 0;
  stepGestureEngine(state, withIndexAt(hand, 0.5), 'browse', (now += 34));
  const first = flick(state, hand, 'browse', (now += 34), 0.05);
  assert.ok(first.intents.length > 0);
  const second = flick(state, hand, 'browse', (now += 34), 0.9);
  assert.equal(second.intents.length, 0, 'expected the cooldown to suppress a same-frame follow-up action');
});
