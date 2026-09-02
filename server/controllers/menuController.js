import Product from '../models/Product.js';

export async function getMenu(req, res, next) {
  try {
    const filter = { available: true };
    if (req.query.category === 'Featured') filter.popular = true;
    else if (req.query.category) filter.category = req.query.category;
    const products = await Product.find(filter).sort({ popular: -1, name: 1 }).lean();
    res.json({ success: true, data: products });
  } catch (error) { next(error); }
}
export async function getProduct(req, res, next) {
  try {
    const product = await Product.findOne({ _id: req.params.id, available: true }).lean();
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    return res.json({ success: true, data: product });
  } catch (error) { return next(error); }
}
export async function getCategories(req, res, next) {
  try { const categories = await Product.distinct('category', { available: true }); return res.json({ success: true, data: ['Featured', ...categories] }); } catch (error) { return next(error); }
}
