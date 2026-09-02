import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyHandGesture, buildOpenPalmLandmarks, buildFistLandmarks, buildThumbsUpLandmarks, buildPinchLandmarks } from './gestureClassifier.js';

const basePalm = [
  [0, 0, 0], [0.08, 0.12, 0], [0.14, 0.2, 0], [0.2, 0.28, 0], [0.24, 0.34, 0],
  [0.10, 0.09, 0], [0.16, 0.12, 0], [0.20, 0.17, 0], [0.26, 0.22, 0],
  [0.15, 0.08, 0], [0.19, 0.10, 0], [0.24, 0.14, 0], [0.28, 0.19, 0],
  [0.20, 0.08, 0], [0.23, 0.11, 0], [0.27, 0.15, 0], [0.31, 0.20, 0],
  [0.24, 0.07, 0], [0.27, 0.10, 0], [0.31, 0.15, 0], [0.35, 0.21, 0],
];

const openPalm = buildOpenPalmLandmarks();
const fist = buildFistLandmarks();
const thumbsUp = buildThumbsUpLandmarks();
const pinch = buildPinchLandmarks();

test('open palm classification', () => {
  const result = classifyHandGesture(openPalm);
  assert.equal(result.type, 'OPEN_PALM');
  assert.ok(result.confidence > 0.5);
});

test('fist classification', () => {
  const result = classifyHandGesture(fist);
  assert.equal(result.type, 'FIST');
  assert.ok(result.confidence > 0.5);
});

test('thumbs up classification', () => {
  const result = classifyHandGesture(thumbsUp);
  assert.equal(result.type, 'THUMBS_UP');
  assert.ok(result.confidence > 0.5);
});

test('pinch classification', () => {
  const result = classifyHandGesture(pinch);
  assert.equal(result.type, 'PINCH');
  assert.ok(result.confidence > 0.1);
});

test('unknown hand returns none', () => {
  const result = classifyHandGesture(basePalm);
  assert.equal(result.type, 'NONE');
});
