import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { emitNewOrder, emitOrderUpdated } from '../realtime/socket.js';

const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
const ORDER_STATUSES = ['received', 'preparing', 'ready', 'completed'];
async function createOrderNumber() {
  for (let attempt = 0; attempt < 5; attempt += 1) { const value = `TB-${Math.floor(1000 + Math.random() * 9000)}`; if (!await Order.exists({ orderNumber: value })) return value; }
  return `TB-${Date.now().toString().slice(-6)}`;
}
export async function createOrder(req, res, next) {
  try {
    const { orderType, items, paymentMethod } = req.body;
    if (!['Dine in', 'Takeaway'].includes(orderType)) return res.status(400).json({ success: false, message: 'A valid order type is required.' });
    if (!['UPI', 'Card', 'Cash'].includes(paymentMethod)) return res.status(400).json({ success: false, message: 'A valid payment method is required.' });
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ success: false, message: 'Add at least one item before checkout.' });
    if (items.length > 25 || items.some((item) => !isObject(item) || !item.productId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20)) return res.status(400).json({ success: false, message: 'One or more order items are invalid.' });
    const ids = [...new Set(items.map((item) => item.productId))];
    const products = await Product.find({ _id: { $in: ids }, available: true }).lean();
    const productById = new Map(products.map((product) => [String(product._id), product]));
    if (productById.size !== ids.length) return res.status(400).json({ success: false, message: 'One or more products are unavailable.' });
    const calculatedItems = items.map((item) => {
      const product = productById.get(item.productId); const requested = Array.isArray(item.customizationIds) ? item.customizationIds : [];
      if (requested.length > product.customizationOptions.length || new Set(requested).size !== requested.length) throw Object.assign(new Error('Invalid customization selection.'), { statusCode: 400 });
      const allowed = new Map(product.customizationOptions.map((option) => [option.id, option]));
      const selectedCustomizations = requested.map((id) => allowed.get(id)).filter(Boolean);
      if (selectedCustomizations.length !== requested.length) throw Object.assign(new Error('Invalid customization selection.'), { statusCode: 400 });
      const finalItemPrice = (product.price + selectedCustomizations.reduce((sum, option) => sum + option.price, 0)) * item.quantity;
      return { product: product._id, productName: product.name, basePrice: product.price, quantity: item.quantity, selectedCustomizations, finalItemPrice };
    });
    const subtotal = calculatedItems.reduce((sum, item) => sum + item.finalItemPrice, 0); const tax = Math.round(subtotal * 0.05);
    const order = await Order.create({ orderNumber: await createOrderNumber(), orderType, items: calculatedItems, subtotal, tax, total: subtotal + tax, paymentMethod });
    emitNewOrder(order);
    return res.status(201).json({ success: true, data: order });
  } catch (error) { if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message }); return next(error); }
}
export async function getOrder(req, res, next) { try { const order = await Order.findOne({ orderNumber: req.params.orderNumber.toUpperCase() }).lean(); if (!order) return res.status(404).json({ success: false, message: 'Order not found' }); return res.json({ success: true, data: order }); } catch (error) { return next(error); } }

// ── Merchant-only below (mounted behind requireAdmin in orderRoutes.js) ──

export async function listOrders(req, res, next) {
  try {
    const filter = {};
    if (req.query.status && ORDER_STATUSES.includes(req.query.status)) filter.orderStatus = req.query.status;
    if (req.query.active === 'true') filter.orderStatus = { $ne: 'completed' };

    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ success: true, data: orders });
  } catch (error) {
    return next(error);
  }
}

export async function updateOrderStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${ORDER_STATUSES.join(', ')}` });
    }
    const order = await Order.findByIdAndUpdate(req.params.id, { orderStatus: status }, { new: true }).lean();
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    emitOrderUpdated(order);
    return res.json({ success: true, data: order });
  } catch (error) {
    return next(error);
  }
}
