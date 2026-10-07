import mongoose from 'mongoose';

const knowledgeDocumentSchema = new mongoose.Schema({
  sourceType: { type: String, required: true, enum: ['product', 'restaurant'], default: 'product' },
  sourceId: { type: String, required: true },
  knowledgeVersion: { type: String, required: true },
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true, trim: true },
  metadata: {
    productId: { type: String },
    category: { type: String },
  },
  embedding: { type: [Number], required: true },
  embeddingModel: { type: String, required: true },
  embeddingDimensions: { type: Number, required: true },
}, { timestamps: true });

knowledgeDocumentSchema.index({ sourceType: 1, sourceId: 1, knowledgeVersion: 1 }, { unique: true });

export default mongoose.model('KnowledgeDocument', knowledgeDocumentSchema);