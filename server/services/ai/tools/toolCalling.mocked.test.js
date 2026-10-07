import test from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: './server/.env' });
process.env.AI_PROVIDER = 'gemini';
process.env.GEMINI_API_KEY = 'mock-key';
process.env.GEMINI_MODEL = 'mock-model';

const { connectDatabase } = await import('../../../config/db.js');
const Product = (await import('../../../models/Product.js')).default;
const { generateActionResponse } = await import('../llmService.js');
const { executeToolCall } = await import('./index.js');

await connectDatabase();
const burger = await Product.findOne({ name: 'Classic Smash Burger' }).lean();
const fries = await Product.findOne({ name: 'Sea Salt Fries' }).lean();

test.after(async () => {
  await mongoose.disconnect();
});

function mockGeminiSequence(responses) {
  let index = 0;
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    async json() {
      const response = responses[index];
      index += 1;
      return { candidates: [{ content: { role: 'model', parts: response } }] };
    },
  });
  return () => { global.fetch = originalFetch; };
}

function call(name, args) {
  return [{ functionCall: { name, args } }];
}

function text(value) {
  return [{ text: value }];
}

test('A: mocked add flow executes getProduct, addToCart, then final response', async () => {
  const restore = mockGeminiSequence([
    call('getProduct', { productName: 'Classic Smash Burger' }),
    call('addToCart', { productId: String(burger._id), quantity: 1, customizations: [] }),
    text('Done, I added the Classic Smash Burger to your cart.'),
  ]);
  try {
    const result = await generateActionResponse({ transcript: 'Add the Classic Smash Burger to my cart.', cartItems: [] });
    assert.match(result.response, /added the Classic Smash Burger/i);
    assert.equal(result.cart.length, 1);
    assert.equal(result.cart[0].id, String(burger._id));
    assert.equal(result.cart[0].price, burger.price);
  } finally { restore(); }
});

test('B: mocked getCart flow returns server-calculated cart data to the final response', async () => {
  const cartItems = [{ id: String(burger._id), key: `${burger._id}-`, quantity: 1, selectedOptions: [] }];
  const restore = mockGeminiSequence([call('getCart', {}), text('Your cart has one Classic Smash Burger.')]);
  try {
    const result = await generateActionResponse({ transcript: 'What is in my cart?', cartItems });
    assert.match(result.response, /one Classic Smash Burger/i);
    assert.equal(result.cart[0].price, burger.price);
    assert.equal(result.cart[0].lineTotal, burger.price);
  } finally { restore(); }
});

test('C: mocked remove flow reads the cart, removes fries, and returns the updated cart', async () => {
  const cartItems = [{ id: String(fries._id), key: `${fries._id}-`, quantity: 1, selectedOptions: [] }];
  const restore = mockGeminiSequence([call('getCart', {}), call('removeFromCart', { productId: String(fries._id) }), text('I removed the fries.')]);
  try {
    const result = await generateActionResponse({ transcript: 'Remove the fries.', cartItems });
    assert.match(result.response, /removed the fries/i);
    assert.equal(result.cart.length, 0);
  } finally { restore(); }
});

test('D: mocked update flow reads the cart, updates quantity, and returns totals', async () => {
  const cartItems = [{ id: String(burger._id), key: `${burger._id}-`, quantity: 1, selectedOptions: [] }];
  const restore = mockGeminiSequence([call('getCart', {}), call('updateCartItem', { productId: String(burger._id), quantity: 2 }), text('Your burger quantity is now 2.')]);
  try {
    const result = await generateActionResponse({ transcript: 'Change my burger quantity to 2.', cartItems });
    assert.match(result.response, /quantity is now 2/i);
    assert.equal(result.cart[0].quantity, 2);
    assert.equal(result.cart[0].subtotal, undefined);
    assert.equal(result.cart[0].lineTotal, burger.price * 2);
  } finally { restore(); }
});

test('E: fake products are rejected by the backend registry', async () => {
  const result = await executeToolCall('getProduct', { productName: 'Product That Does Not Exist' });
  assert.equal(result.success, false);
  assert.equal(result.error.code, 'PRODUCT_NOT_FOUND');
});

test('F: invalid customizations are rejected', async () => {
  const result = await executeToolCall('addToCart', { productId: String(burger._id), quantity: 1, customizations: [{ id: 'fake-option' }] }, { cartItems: [] });
  assert.equal(result.success, false);
  assert.equal(result.error.code, 'INVALID_CUSTOMIZATION');
});

test('G: client-supplied fake prices are ignored in favor of MongoDB prices', async () => {
  const result = await executeToolCall('addToCart', { productId: String(burger._id), quantity: 1, customizations: [] }, { cartItems: [{ id: String(burger._id), key: `${burger._id}-`, quantity: 1, price: 0.01, selectedOptions: [] }] });
  assert.equal(result.success, true);
  assert.equal(result.cart.items[0].price, burger.price);
  assert.equal(result.cart.items[0].lineTotal, burger.price * 2);
});

test('H: MongoDB operator injection is rejected', async () => {
  const result = await executeToolCall('searchMenu', { $where: 'db.dropDatabase()' });
  assert.equal(result.success, false);
  assert.equal(result.error.code, 'INVALID_ARGUMENTS');
});
