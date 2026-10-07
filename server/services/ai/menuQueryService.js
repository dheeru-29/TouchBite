import Product from '../../models/Product.js';
import { validateMenuIntent } from './menuIntent.js';

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function executeMenuIntent(rawIntent) {
  const intent = validateMenuIntent(rawIntent);

  if (intent.intent === 'LIST_CATEGORIES') {
    const categories = await Product.distinct('category', { available: true });
    return { intent, products: [], categories: categories.sort() };
  }

  if (intent.intent === 'GET_PRODUCT') {
    const product = await Product.findOne({ _id: intent.productId, available: true }).lean();
    return { intent, products: product ? [product] : [], categories: [] };
  }

  if (intent.intent !== 'SEARCH_MENU') {
    throw new Error(`Intent ${intent.intent} is not a structured menu query.`);
  }

  const query = { available: intent.filters.available ?? true };
  if (intent.filters.category) query.category = intent.filters.category;
  if (intent.filters.vegetarian !== undefined) query.vegetarian = intent.filters.vegetarian;
  if (intent.filters.minPrice !== undefined || intent.filters.maxPrice !== undefined) {
    query.price = {};
    if (intent.filters.minPrice !== undefined) query.price.$gte = intent.filters.minPrice;
    if (intent.filters.maxPrice !== undefined) query.price.$lte = intent.filters.maxPrice;
  }
  if (intent.filters.search) query.name = { $regex: escapeRegex(intent.filters.search), $options: 'i' };

  const sort = intent.sort
    ? { [intent.sort.field]: intent.sort.order === 'asc' ? 1 : -1 }
    : { popular: -1, name: 1 };
  const products = await Product.find(query).sort(sort).limit(intent.limit).lean();
  return { intent, products, categories: [] };
}