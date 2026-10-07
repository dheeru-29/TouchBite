import { assertNoUnknownKeys, assertObject, validateCartSnapshot } from './toolHelpers.js';

export const removeFromCartSchema = { type: 'object', additionalProperties: false, properties: { productId: { type: 'string' }, cartItemKey: { type: 'string' } } };

export async function removeFromCartTool(rawArguments = {}, context = {}) {
  const args = assertObject(rawArguments);
  assertNoUnknownKeys(args, ['productId', 'cartItemKey']);
  if (!args.productId && !args.cartItemKey) { const error = new Error('A productId or cartItemKey is required.'); error.code = 'INVALID_ARGUMENTS'; throw error; }
  if (args.productId && !/^[a-f\d]{24}$/i.test(args.productId)) { const error = new Error('A valid productId is required.'); error.code = 'INVALID_PRODUCT_ID'; throw error; }
  const current = await validateCartSnapshot(context.cartItems || []);
  const items = current.items.filter((item) => (args.productId && item.id !== args.productId) || (args.cartItemKey && item.key !== args.cartItemKey));
  if (items.length === current.items.length) { const error = new Error('That product is not in the cart.'); error.code = 'CART_ITEM_NOT_FOUND'; throw error; }
  return { success: true, operation: 'removed', cart: await validateCartSnapshot(items) };
}
