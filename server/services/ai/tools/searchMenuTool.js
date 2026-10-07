import Product from '../../../models/Product.js';
import { assertNoUnknownKeys, assertObject, normalizeProduct } from './toolHelpers.js';

export const searchMenuSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    query: { type: 'string' }, category: { type: 'string', enum: ['Burgers', 'Chicken', 'Meals', 'Fries & Sides', 'Beverages', 'Desserts'] }, vegetarian: { type: 'boolean' }, maxPrice: { type: 'number', minimum: 0 }, limit: { type: 'integer', minimum: 1, maximum: 50 },
  },
};

export async function searchMenuTool(rawArguments = {}) {
  const args = assertObject(rawArguments);
  assertNoUnknownKeys(args, ['query', 'category', 'vegetarian', 'maxPrice', 'limit']);
  if (args.query !== undefined && (typeof args.query !== 'string' || !args.query.trim())) { const error = new Error('query must be non-empty text.'); error.code = 'INVALID_ARGUMENTS'; throw error; }
  if (args.category !== undefined && !['Burgers', 'Chicken', 'Meals', 'Fries & Sides', 'Beverages', 'Desserts'].includes(args.category)) { const error = new Error('Unsupported menu category.'); error.code = 'INVALID_ARGUMENTS'; throw error; }
  if (args.vegetarian !== undefined && typeof args.vegetarian !== 'boolean') { const error = new Error('vegetarian must be a boolean.'); error.code = 'INVALID_ARGUMENTS'; throw error; }
  if (args.maxPrice !== undefined && (typeof args.maxPrice !== 'number' || !Number.isFinite(args.maxPrice) || args.maxPrice < 0)) { const error = new Error('maxPrice must be a non-negative number.'); error.code = 'INVALID_ARGUMENTS'; throw error; }
  const query = { available: true };
  if (args.category !== undefined) query.category = args.category;
  if (args.vegetarian !== undefined) query.vegetarian = args.vegetarian;
  if (args.maxPrice !== undefined) query.price = { $lte: args.maxPrice };
  if (args.query !== undefined) query.name = { $regex: args.query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  const limit = args.limit === undefined ? 50 : args.limit;
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    const error = new Error('Limit must be an integer from 1 to 50.'); error.code = 'INVALID_ARGUMENTS'; throw error;
  }
  const products = await Product.find(query).sort(args.maxPrice !== undefined ? { price: 1, name: 1 } : { popular: -1, name: 1 }).limit(limit).lean();
  return { success: true, products: products.map(normalizeProduct) };
}
