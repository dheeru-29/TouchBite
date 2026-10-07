import { assertNoUnknownKeys, assertObject, validateCartSnapshot } from './toolHelpers.js';

export const getCartSchema = { type: 'object', additionalProperties: false, properties: {} };

export async function getCartTool(rawArguments = {}, context = {}) {
  const args = assertObject(rawArguments);
  assertNoUnknownKeys(args, []);
  const cart = await validateCartSnapshot(context.cartItems || []);
  return { success: true, cart };
}
