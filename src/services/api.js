const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path, options) {
  const response = await fetch(`${API_URL}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || 'Unable to reach TouchBite right now.');
  return payload.data;
}
export const toMenuItem = (product) => ({ ...product, id: product._id, options: product.customizationOptions || [] });
export const menuApi = { getMenu: (category) => request(`/menu${category && category !== 'Featured' ? `?category=${encodeURIComponent(category)}` : ''}`).then((items) => items.map(toMenuItem)), getProduct: (id) => request(`/menu/${id}`).then(toMenuItem), getCategories: () => request('/categories') };
export const orderApi = { create: ({ orderType, paymentMethod, items }) => request('/orders', { method: 'POST', body: JSON.stringify({ orderType, paymentMethod, items: items.map((item) => ({ productId: item.id, quantity: item.quantity, customizationIds: item.selectedOptions.map((option) => option.id) })) }) }) };
