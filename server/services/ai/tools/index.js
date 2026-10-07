import { searchMenuTool, searchMenuSchema } from './searchMenuTool.js';
import { getProductTool, getProductSchema } from './getProductTool.js';
import { getCartTool, getCartSchema } from './getCartTool.js';
import { addToCartTool, addToCartSchema } from './addToCartTool.js';
import { removeFromCartTool, removeFromCartSchema } from './removeFromCartTool.js';
import { updateCartItemTool, updateCartItemSchema } from './updateCartItemTool.js';
import { getAvailableCustomizationsTool, getAvailableCustomizationsSchema } from './getAvailableCustomizationsTool.js';

export const TOOL_DEFINITIONS = [
  { name: 'searchMenu', description: 'Search currently available menu products.', parameters: searchMenuSchema },
  { name: 'getProduct', description: 'Get a real menu product by its exact product name or ID.', parameters: getProductSchema },
  { name: 'getCart', description: 'Read the current kiosk cart and server-validated subtotal.', parameters: getCartSchema },
  { name: 'addToCart', description: 'Add an available product to the current kiosk cart. Provide exactly one of the exact productId or the exact productName from the menu.', parameters: addToCartSchema },
  { name: 'removeFromCart', description: 'Remove an existing product line from the current kiosk cart.', parameters: removeFromCartSchema },
  { name: 'updateCartItem', description: 'Change the quantity of an existing cart line.', parameters: updateCartItemSchema },
  { name: 'getAvailableCustomizations', description: 'Read customization options from the real product record.', parameters: getAvailableCustomizationsSchema },
];

const TOOL_HANDLERS = {
  searchMenu: searchMenuTool,
  getProduct: getProductTool,
  getCart: getCartTool,
  addToCart: addToCartTool,
  removeFromCart: removeFromCartTool,
  updateCartItem: updateCartItemTool,
  getAvailableCustomizations: getAvailableCustomizationsTool,
};

export async function executeToolCall(name, argumentsValue, context = {}) {
  const handler = TOOL_HANDLERS[name];
  if (!handler) return { success: false, error: { code: 'UNKNOWN_TOOL', message: 'Unknown tool.' } };
  try {
    return await handler(argumentsValue, context);
  } catch (error) {
    console.error(`[AI] Tool ${name} failed:`, error.message || error);
    return {
      success: false,
      error: { code: error.code || 'TOOL_FAILED', message: error.publicMessage || error.message || 'Tool execution failed.' },
    };
  }
}

export function sanitizeCartSnapshot(items = []) {
  return Array.isArray(items) ? items : [];
}
