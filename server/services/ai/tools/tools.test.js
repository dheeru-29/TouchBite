import test from 'node:test';
import assert from 'node:assert/strict';
import { executeToolCall } from './index.js';
import { assertQuantity, normalizeCartItem } from './toolHelpers.js';

test('unknown tools are rejected', async () => {
  const result = await executeToolCall('dropDatabase', {}, {});
  assert.equal(result.success, false);
  assert.equal(result.error.code, 'UNKNOWN_TOOL');
});

test('MongoDB operator-shaped tool arguments are rejected', async () => {
  const result = await executeToolCall('searchMenu', { $where: 'bad' }, {});
  assert.equal(result.success, false);
  assert.equal(result.error.code, 'INVALID_ARGUMENTS');
});

test('invalid quantities are rejected', () => {
  assert.throws(() => assertQuantity(0), /Quantity must be an integer/);
  assert.throws(() => assertQuantity(21), /Quantity must be an integer/);
});

test('cart normalization ignores client prices and uses the product record', () => {
  const item = normalizeCartItem(
    { id: 'product-id', key: 'product-id-', quantity: 1, selectedOptions: [] },
    { _id: 'product-id', name: 'Real product', description: 'Description', price: 179, category: 'Burgers', vegetarian: true, available: true, image: 'image', customizationOptions: [] }
  );
  assert.equal(item.price, 179);
  assert.equal(item.lineTotal, 179);
});
