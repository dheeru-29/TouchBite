import { assertNoUnknownKeys, assertObject, findAvailableProduct, findProductByName, normalizeProduct } from './toolHelpers.js';

export const getProductSchema = {
  type: 'object', additionalProperties: false,
  properties: { productId: { type: 'string' }, productName: { type: 'string' } },
};

export async function getProductTool(rawArguments = {}) {
  const args = assertObject(rawArguments);
  assertNoUnknownKeys(args, ['productId', 'productName']);
  if ((args.productId && args.productName) || (!args.productId && !args.productName)) {
    const error = new Error('Provide exactly one of productId or productName.'); error.code = 'INVALID_ARGUMENTS'; throw error;
  }
  const product = args.productId ? await findAvailableProduct(args.productId) : await findProductByName(args.productName);
  return { success: true, product: normalizeProduct(product) };
}
