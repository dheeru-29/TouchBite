import { assertNoUnknownKeys, assertObject, assertQuantity, findAvailableProduct, findProductByName, validateCartSnapshot } from './toolHelpers.js';

export const addToCartSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    productId: { type: 'string' },
    productName: { type: 'string' },
    quantity: { type: 'integer', minimum: 1, maximum: 20 },
    customizations: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { id: { type: 'string' } }, required: ['id'] } },
  },
  required: ['quantity'],
};

export async function addToCartTool(rawArguments = {}, context = {}) {
  const args = assertObject(rawArguments);
  assertNoUnknownKeys(args, ['productId', 'productName', 'quantity', 'customizations']);
  if (Boolean(args.productId) === Boolean(args.productName)) { const error = new Error('Provide exactly one of productId or productName.'); error.code = 'INVALID_ARGUMENTS'; throw error; }
  assertQuantity(args.quantity);
  const product = args.productName
    ? await findProductByName(args.productName)
    : /^[a-f\d]{24}$/i.test(args.productId)
      ? await findAvailableProduct(args.productId)
      : await findProductByName(args.productId);
  const selectedOptions = Array.isArray(args.customizations) ? args.customizations : [];
  const key = `${product._id}-${selectedOptions.map((option) => option.id).sort().join('-')}`;
  const existing = (context.cartItems || []).find((item) => item.key === key);
  const updatedItems = existing
    ? (context.cartItems || []).map((item) => item.key === key ? { ...item, quantity: item.quantity + args.quantity } : item)
    : [...(context.cartItems || []), { id: String(product._id), key, quantity: args.quantity, selectedOptions }];
  const updatedQuantity = existing ? existing.quantity + args.quantity : args.quantity;
  assertQuantity(updatedQuantity);
  const cart = await validateCartSnapshot(updatedItems);
  return { success: true, operation: 'added', productId: String(product._id), quantity: args.quantity, cart };
}
