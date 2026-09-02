import mongoose from 'mongoose';

const customizationOptionSchema = new mongoose.Schema({
  id: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  price: { type: Number, required: true, min: 0 },
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, trim: true, maxlength: 500 },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true, enum: ['Burgers', 'Chicken', 'Meals', 'Fries & Sides', 'Beverages', 'Desserts'] },
  image: { type: String, required: true, trim: true },
  popular: { type: Boolean, default: false }, vegetarian: { type: Boolean, default: false },
  customizationOptions: { type: [customizationOptionSchema], default: [] }, available: { type: Boolean, default: true },
}, { timestamps: true });
export default mongoose.model('Product', productSchema);
