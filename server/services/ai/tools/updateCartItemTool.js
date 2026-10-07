import { assertNoUnknownKeys, assertObject, assertQuantity, validateCartSnapshot } from './toolHelpers.js';

export const updateCartItemSchema = { type: 'object', additionalProperties: false, properties: { productId: { type: 'string' }, cartItemKey: { type: 'string' }, quantity: { type: 'integer', minimum: 1, maximum: 20 } }, required: ['quantity'] };

export async function updateCartItemTool(rawArguments = {}, context = {}) {
  const args = assertObject(rawArguments);
  assertNoUnknownKeys(args, ['productId', 'cartItemKey', 'quantity']);
  assertQuantity(args.quantity);
  if (!args.productId && !args.cartItemKey) { const error = new Error('A productId or cartItemKey is required.'); error.code = 'INVALID_ARGUMENTS'; throw error; }
  if (args.productId && !/^[a-f\d]{24}$/i.test(args.productId)) { const error = new Error('A valid productId is required.'); error.code = 'INVALID_PRODUCT_ID'; throw error; }
  const current = await validateCartSnapshot(context.cartItems || []);
  let matched = false;
  const items = current.items.map((item) => {
    const isMatch = (args.productId && item.id === args.productId) || (args.cartItemKey && item.key === args.cartItemKey);
    if (!isMatch) return item;
    matched = true;
    return { ...item, quantity: args.quantity };
  });
  if (!matched) { const error = new Error('That product is not in the cart.'); error.code = 'CART_ITEM_NOT_FOUND'; throw error; }
  return { success: true, operation: 'updated', cart: await validateCartSnapshot(items) };
}
