import mongoose from 'mongoose';

export const MENU_INTENTS = ['CHAT', 'KNOWLEDGE_QUERY', 'ACTION_REQUEST', 'SEARCH_MENU', 'GET_PRODUCT', 'LIST_CATEGORIES'];
export const MENU_CATEGORIES = ['Burgers', 'Chicken', 'Meals', 'Fries & Sides', 'Beverages', 'Desserts'];

const FILTER_KEYS = new Set([
  'category',
  'vegetarian',
  'available',
  'minPrice',
  'maxPrice',
  'search',
]);
const SORT_FIELDS = new Set(['price', 'name']);

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function cleanFilters(filters = {}) {
  if (filters === null || filters === undefined) return {};
  if (!filters || typeof filters !== 'object' || Array.isArray(filters)) {
    throw new Error('Menu filters must be an object.');
  }

  const unknownFilter = Object.keys(filters).find((key) => !FILTER_KEYS.has(key));
  if (unknownFilter) throw new Error(`Unsupported menu filter: ${unknownFilter}.`);

  const cleaned = {};
  if (filters.category !== undefined && filters.category !== null) {
    if (typeof filters.category !== 'string' || !MENU_CATEGORIES.includes(filters.category)) {
      throw new Error('Unsupported menu category.');
    }
    cleaned.category = filters.category;
  }
  for (const key of ['vegetarian', 'available']) {
    if (filters[key] !== undefined && filters[key] !== null) {
      if (typeof filters[key] !== 'boolean') throw new Error(`${key} must be a boolean.`);
      cleaned[key] = filters[key];
    }
  }
  for (const key of ['minPrice', 'maxPrice']) {
    if (filters[key] !== undefined && filters[key] !== null) {
      if (!isFiniteNumber(filters[key])) throw new Error(`${key} must be a non-negative number.`);
      cleaned[key] = filters[key];
    }
  }
  if (filters.search !== undefined && filters.search !== null) {
    if (typeof filters.search !== 'string' || !filters.search.trim()) throw new Error('Search text must be non-empty.');
    cleaned.search = filters.search.trim().slice(0, 120);
  }
  if (cleaned.minPrice !== undefined && cleaned.maxPrice !== undefined && cleaned.minPrice > cleaned.maxPrice) {
    throw new Error('minPrice cannot be greater than maxPrice.');
  }
  return cleaned;
}

export function validateMenuIntent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid menu intent.');
  if (!MENU_INTENTS.includes(value.intent)) throw new Error('Unsupported menu intent.');

  const intent = { intent: value.intent, filters: cleanFilters(value.filters) };
  if (value.sort !== undefined && value.sort !== null) {
    if (!SORT_FIELDS.has(value.sort.field) || !['asc', 'desc'].includes(value.sort.order)) {
      throw new Error('Unsupported menu sort.');
    }
    intent.sort = { field: value.sort.field, order: value.sort.order };
  } else {
    intent.sort = null;
  }

  const limit = value.limit === undefined ? 50 : value.limit;
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error('Menu limit must be an integer from 1 to 50.');
  intent.limit = limit;

  if (intent.intent === 'GET_PRODUCT') {
    const productId = value.productId;
    if (!productId || typeof productId !== 'string' || !mongoose.isValidObjectId(productId)) {
      throw new Error('GET_PRODUCT requires a valid productId.');
    }
    intent.productId = productId;
  }
  return intent;
}

export function inferSafeMenuIntent(transcript) {
  const text = String(transcript || '').toLowerCase();
  const isMenuRequest = /\b(menu|burger|chicken|meal|fries?|sides?|beverage|drink|dessert|vegetarian|vegan|veg|product|food|available|cheapest|price|under|below|less than|up to|within|over|above|more than|₹|rs\.?|inr)\b/i.test(text);
  if (!isMenuRequest) return null;

  const category = /\bburger\w*\b/i.test(text) ? 'Burgers'
    : /\bchicken\b/i.test(text) ? 'Chicken'
      : /\bmeal\w*\b/i.test(text) ? 'Meals'
        : /\bfries|sides?\b/i.test(text) ? 'Fries & Sides'
          : /\bbeverage|drink\w*\b/i.test(text) ? 'Beverages'
            : /\bdessert\w*\b/i.test(text) ? 'Desserts' : null;
  const priceMatch = text.match(/\b(?:under|below|less than|up to|within)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i);
  const minimumPriceMatch = text.match(/\b(?:over|above|more than|at least)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i);
  const intent = {
    intent: 'SEARCH_MENU',
    filters: {
      category,
      vegetarian: /\bveg(?:etarian)?|vegan\b/i.test(text) ? true : null,
      available: /\bavailable\b/i.test(text) ? true : null,
      minPrice: minimumPriceMatch ? Number(minimumPriceMatch[1]) : null,
      maxPrice: priceMatch ? Number(priceMatch[1]) : null,
      search: null,
    },
    sort: /\bcheapest|lowest price\b/i.test(text) ? { field: 'price', order: 'asc' } : null,
    limit: 50,
    productId: null,
  };
  return validateMenuIntent(intent);
}

export const MENU_INTENT_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['intent', 'filters', 'sort', 'limit', 'productId'],
  properties: {
    intent: { type: 'string', enum: MENU_INTENTS },
    filters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        category: { type: ['string', 'null'], enum: [...MENU_CATEGORIES, null] },
        vegetarian: { type: ['boolean', 'null'] },
        available: { type: ['boolean', 'null'] },
        minPrice: { type: ['number', 'null'], minimum: 0 },
        maxPrice: { type: ['number', 'null'], minimum: 0 },
        search: { type: ['string', 'null'] },
      },
      required: ['category', 'vegetarian', 'available', 'minPrice', 'maxPrice', 'search'],
    },
    sort: {
      type: ['object', 'null'],
      additionalProperties: false,
      properties: {
        field: { type: 'string', enum: ['price', 'name'] },
        order: { type: 'string', enum: ['asc', 'desc'] },
      },
      required: ['field', 'order'],
    },
    limit: { type: 'integer', minimum: 1, maximum: 50 },
    productId: { type: ['string', 'null'] },
  },
};

export const GEMINI_MENU_INTENT_SCHEMA = {
  type: 'OBJECT',
  properties: {
    intent: { type: 'STRING', enum: MENU_INTENTS },
    filters: {
      type: 'OBJECT',
      properties: {
        category: { type: 'STRING', enum: MENU_CATEGORIES, nullable: true },
        vegetarian: { type: 'BOOLEAN', nullable: true },
        available: { type: 'BOOLEAN', nullable: true },
        minPrice: { type: 'NUMBER', nullable: true },
        maxPrice: { type: 'NUMBER', nullable: true },
        search: { type: 'STRING', nullable: true },
      },
    },
    sort: {
      type: 'OBJECT',
      nullable: true,
      properties: {
        field: { type: 'STRING', enum: ['price', 'name'] },
        order: { type: 'STRING', enum: ['asc', 'desc'] },
      },
    },
    limit: { type: 'INTEGER', minimum: 1, maximum: 50 },
    productId: { type: 'STRING', nullable: true },
  },
  required: ['intent', 'filters', 'sort', 'limit', 'productId'],
};