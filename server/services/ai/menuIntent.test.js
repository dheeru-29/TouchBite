import test from 'node:test';
import assert from 'node:assert/strict';
import { inferSafeMenuIntent, validateMenuIntent } from './menuIntent.js';

test('menu price fallback returns all matching products by default', () => {
  const intent = inferSafeMenuIntent('Show me food options under 300');

  assert.equal(intent.intent, 'SEARCH_MENU');
  assert.equal(intent.filters.maxPrice, 300);
  assert.equal(intent.limit, 50);
});

test('menu price fallback applies minimum price constraints', () => {
  const intent = inferSafeMenuIntent('Show me food options over 200');

  assert.equal(intent.filters.minPrice, 200);
  assert.equal(intent.limit, 50);
});

test('chat intents tolerate an empty filter value from the model', () => {
  const intent = validateMenuIntent({
    intent: 'CHAT',
    filters: null,
    limit: 1,
  });

  assert.deepEqual(intent.filters, {});
});
