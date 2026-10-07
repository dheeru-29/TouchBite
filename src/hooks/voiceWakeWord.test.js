import test from 'node:test';
import assert from 'node:assert/strict';
import { detectWakeWord, extractCommandAfterWakeWord } from './voiceWakeWord.js';

test('detects the supported wake phrase case-insensitively', () => {
  assert.equal(detectWakeWord('Hey TouchBite'), true);
  assert.equal(detectWakeWord('hey touchbite'), true);
  assert.equal(detectWakeWord('HEY TOUCHBITE'), true);
  assert.equal(detectWakeWord('hello'), true);
  assert.equal(detectWakeWord("hello that's right"), true);
  assert.equal(detectWakeWord('show me burgers'), false);
});

test('extracts an inline command without sending the wake phrase', () => {
  assert.equal(extractCommandAfterWakeWord('Hey TouchBite, show me burgers'), 'show me burgers');
  assert.equal(extractCommandAfterWakeWord('hello'), '');
  assert.equal(extractCommandAfterWakeWord("hello that's right"), '');
  assert.equal(extractCommandAfterWakeWord('hey touchbite'), '');
});
