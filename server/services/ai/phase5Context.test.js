import test from 'node:test';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';

dotenv.config({ path: './server/.env' });
process.env.AI_PROVIDER = 'gemini';
process.env.GEMINI_API_KEY = 'phase5-mock-key';
process.env.GEMINI_MODEL = 'phase5-mock-model';

const { connectDatabase } = await import('../../config/db.js');
const Product = (await import('../../models/Product.js')).default;
const { handleChatRequest } = await import('./aiOrchestrator.js');
const { generateActionResponse } = await import('./llmService.js');

await connectDatabase();
const burger = await Product.findOne({ name: 'Classic Smash Burger' }).lean();

function mockGeminiResponses(responses, requests = []) {
  const originalFetch = global.fetch;
  let index = 0;
  global.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    const response = responses[index++];
    return { ok: true, status: 200, async json() { return response; } };
  };
  return () => { global.fetch = originalFetch; };
}

function intentResponse(intent) {
  return { candidates: [{ content: { parts: [{ text: JSON.stringify({ intent, filters: {}, sort: null, limit: 5, productId: null }) }] } }] };
}

function textResponse(text) {
  return { candidates: [{ content: { role: 'model', parts: [{ text }] } }] };
}

function functionResponse(name, args) {
  return { candidates: [{ content: { role: 'model', parts: [{ functionCall: { name, args } }] } }] };
}

test.after(async () => {
  const mongoose = await import('mongoose');
  await mongoose.default.disconnect();
});

test('contextual menu follow-up receives the first menu turn', async () => {
  const requests = [];
  const restore = mockGeminiResponses([
    intentResponse('SEARCH_MENU'), textResponse('Vegetarian burgers are available.'),
    intentResponse('SEARCH_MENU'), textResponse('The cheapest matching burger is Classic Smash Burger.'),
  ], requests);
  try {
    const first = await handleChatRequest({ transcript: 'Show me vegetarian burgers.' });
    await handleChatRequest({ transcript: 'Which one is cheapest?', sessionId: first.sessionId });
    assert.match(requests[2].contents[0].parts[0].text, /Show me vegetarian burgers/);
    assert.match(requests[2].contents[0].parts[0].text, /Vegetarian burgers are available/);
  } finally { restore(); }
});

test('contextual filter follow-up receives prior burger context', async () => {
  const requests = [];
  const restore = mockGeminiResponses([
    intentResponse('SEARCH_MENU'), textResponse('Here are vegetarian burgers.'),
    intentResponse('SEARCH_MENU'), textResponse('Here are those burgers under 200.'),
  ], requests);
  try {
    const first = await handleChatRequest({ transcript: 'Show me vegetarian burgers.' });
    await handleChatRequest({ transcript: 'Under 200.', sessionId: first.sessionId });
    assert.match(requests[2].contents[0].parts[0].text, /Show me vegetarian burgers/);
  } finally { restore(); }
});

test('contextual cart action supplies prior product context to the tool model', async () => {
  const requests = [];
  const restore = mockGeminiResponses([
    functionResponse('updateCartItem', { productId: String(burger._id), quantity: 2 }),
    textResponse('I changed the Classic Smash Burger quantity to 2.'),
  ], requests);
  try {
    const result = await generateActionResponse({
      transcript: 'Make it two.',
      cartItems: [{ id: String(burger._id), key: `${burger._id}-`, quantity: 1, selectedOptions: [] }],
      conversationContext: 'User: Add the Classic Smash Burger to my cart.\nTouchBite: I added the Classic Smash Burger to your cart.',
    });
    assert.match(requests[0].contents[0].parts[0].text, /Classic Smash Burger/);
    assert.equal(result.cart[0].id, String(burger._id));
    assert.equal(result.cart[0].quantity, 2);
  } finally { restore(); }
});

test('contextual product action supplies product context before adding it', async () => {
  const requests = [];
  const restore = mockGeminiResponses([
    functionResponse('getAvailableCustomizations', { productId: String(burger._id) }),
    functionResponse('addToCart', { productId: String(burger._id), quantity: 1, customizations: [] }),
    textResponse('I added the Classic Smash Burger to your cart.'),
  ], requests);
  try {
    const result = await generateActionResponse({
      transcript: 'Add it to my cart.',
      conversationContext: 'User: What can I customize on the Classic Smash Burger?\nTouchBite: You can customize the Classic Smash Burger.',
      cartItems: [],
    });
    assert.match(requests[0].contents[0].parts[0].text, /Classic Smash Burger/);
    assert.equal(result.cart[0].id, String(burger._id));
  } finally { restore(); }
});