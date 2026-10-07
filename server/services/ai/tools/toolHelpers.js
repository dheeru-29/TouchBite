import mongoose from 'mongoose';
import Product from '../../../models/Product.js';

export function assertObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    const error = new Error('Tool arguments must be an object.');
    error.code = 'INVALID_ARGUMENTS';
    throw error;
  }
  return value;
}

export function assertNoUnknownKeys(value, allowedKeys) {
  const unknown = Object.keys(value).find((key) => !allowedKeys.includes(key));
  if (unknown) {
    const error = new Error(`Unsupported tool argument: ${unknown}.`);
    error.code = 'INVALID_ARGUMENTS';
    throw error;
  }
}

export function assertValidProductId(value) {
  if (typeof value !== 'string' || !mongoose.isValidObjectId(value)) {
    const error = new Error('A valid productId is required.');
    error.code = 'INVALID_PRODUCT_ID';
    throw error;
  }
}

export function assertQuantity(value) {
  if (!Number.isInteger(value) || value < 1 || value > 20) {
    const error = new Error('Quantity must be an integer from 1 to 20.');
    error.code = 'INVALID_QUANTITY';
    throw error;
  }
}

export async function findAvailableProduct(productId) {
  assertValidProductId(productId);
  const product = await Product.findOne({ _id: productId, available: true }).lean();
  if (!product) {
    const error = new Error('This product is unavailable.');
    error.code = 'PRODUCT_NOT_AVAILABLE';
    throw error;
  }
  return product;
}

export async function findProductByName(productName) {
  if (typeof productName !== 'string' || !productName.trim()) {
    const error = new Error('A productName is required.');
    error.code = 'INVALID_ARGUMENTS';
    throw error;
  }
  const product = await Product.findOne({
    name: { $regex: `^${productName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    available: true,
  }).lean();
  if (!product) {
    const error = new Error('Product not found or unavailable.');
    error.code = 'PRODUCT_NOT_FOUND';
    throw error;
  }
  return product;
}

export function normalizeProduct(product) {
  return {
    id: String(product._id),
    name: product.name,
    description: product.description,
    price: product.price,
    category: product.category,
    vegetarian: product.vegetarian,
    available: product.available,
    customizationOptions: (product.customizationOptions || []).map(({ id, name, price }) => ({ id, name, price })),
  };
}

export function normalizeCartItem(item, product) {
  const selectedOptions = Array.isArray(item.selectedOptions) ? item.selectedOptions : [];
  const optionsById = new Map((product.customizationOptions || []).map((option) => [option.id, option]));
  const validOptions = selectedOptions.map((option) => optionsById.get(option.id)).filter(Boolean);
  if (validOptions.length !== selectedOptions.length || new Set(selectedOptions.map((option) => option.id)).size !== selectedOptions.length) {
    const error = new Error('One or more customization options are invalid.');
    error.code = 'INVALID_CUSTOMIZATION';
    throw error;
  }
  assertQuantity(item.quantity);
  const optionTotal = validOptions.reduce((sum, option) => sum + option.price, 0);
  return {
    id: String(product._id),
    name: product.name,
    description: product.description,
    price: product.price,
    category: product.category,
    vegetarian: product.vegetarian,
    available: product.available,
    image: product.image,
    options: product.customizationOptions || [],
    key: item.key || `${product._id}-${validOptions.map((option) => option.id).sort().join('-')}`,
    selectedOptions: validOptions,
    quantity: item.quantity,
    lineTotal: (product.price + optionTotal) * item.quantity,
  };
}

export async function validateCartSnapshot(items = []) {
  if (!Array.isArray(items) || items.length > 25) {
    const error = new Error('Cart snapshot is invalid.');
    error.code = 'INVALID_CART';
    throw error;
  }
  const ids = [...new Set(items.map((item) => item?.id))];
  if (ids.some((id) => typeof id !== 'string' || !mongoose.isValidObjectId(id))) {
    const error = new Error('Cart contains an invalid product ID.');
    error.code = 'INVALID_CART';
    throw error;
  }
  const products = await Product.find({ _id: { $in: ids }, available: true }).lean();
  const byId = new Map(products.map((product) => [String(product._id), product]));
  if (byId.size !== ids.length) {
    const error = new Error('Cart contains an unavailable product.');
    error.code = 'PRODUCT_NOT_AVAILABLE';
    throw error;
  }
  const normalizedItems = items.map((item) => normalizeCartItem(item, byId.get(item.id)));
  const subtotal = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  return { items: normalizedItems, subtotal, tax: Math.round(subtotal * 0.05), total: subtotal + Math.round(subtotal * 0.05) };
}
