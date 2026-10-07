import { assertNoUnknownKeys, assertObject, findAvailableProduct, normalizeProduct } from './toolHelpers.js';

export const getAvailableCustomizationsSchema = { type: 'object', additionalProperties: false, properties: { productId: { type: 'string' }, productName: { type: 'string' } } };

export async function getAvailableCustomizationsTool(rawArguments = {}) {
  const args = assertObject(rawArguments);
  assertNoUnknownKeys(args, ['productId', 'productName']);
  if (args.productId && args.productName) { const error = new Error('Provide exactly one of productId or productName.'); error.code = 'INVALID_ARGUMENTS'; throw error; }
  const product = args.productId ? await findAvailableProduct(args.productId) : await (async () => {
    if (!args.productName) { const error = new Error('A productId or productName is required.'); error.code = 'INVALID_ARGUMENTS'; throw error; }
    const { findProductByName } = await import('./toolHelpers.js');
    return findProductByName(args.productName);
  })();
  return { success: true, productId: String(product._id), productName: product.name, customizations: normalizeProduct(product).customizationOptions };
}
