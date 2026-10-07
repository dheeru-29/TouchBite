import KnowledgeDocument from '../../models/KnowledgeDocument.js';
import { createEmbedding, getEmbeddingConfig } from './embeddingService.js';

const KNOWLEDGE_VERSION = 'product-v1';
const VECTOR_INDEX = process.env.MONGODB_VECTOR_INDEX || 'touchbite_knowledge_vector';

export function makeProductKnowledgeDocument(product) {
  const customizationNames = (product.customizationOptions || []).map((option) => option.name).filter(Boolean);
  const customizationText = customizationNames.length
    ? ` Customization options include: ${customizationNames.join(', ')}.`
    : '';
  const content = `${product.name}. Category: ${product.category}. Vegetarian: ${product.vegetarian ? 'Yes' : 'No'}. Description: ${product.description}.${customizationText}`;
  return {
    sourceType: 'product',
    sourceId: String(product._id),
    knowledgeVersion: KNOWLEDGE_VERSION,
    title: product.name,
    content,
    metadata: { productId: String(product._id), category: product.category },
  };
}

export async function upsertProductKnowledge(product) {
  const normalized = makeProductKnowledgeDocument(product);
  const embedding = await createEmbedding({ text: normalized.content, taskType: 'RETRIEVAL_DOCUMENT' });
  const embeddingConfig = getEmbeddingConfig();
  return KnowledgeDocument.findOneAndUpdate(
    { sourceType: normalized.sourceType, sourceId: normalized.sourceId, knowledgeVersion: normalized.knowledgeVersion },
    { $set: { ...normalized, embedding, embeddingModel: embeddingConfig.model, embeddingDimensions: embeddingConfig.dimensions } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
}

export async function retrieveKnowledge({ query, topK = 4, category }) {
  const queryVector = await createEmbedding({ text: query, taskType: 'RETRIEVAL_QUERY' });
  const vectorFilter = category ? { 'metadata.category': { $eq: category } } : undefined;
  const pipeline = [
    {
      $vectorSearch: {
        index: VECTOR_INDEX,
        path: 'embedding',
        queryVector,
        numCandidates: Math.max(topK * 20, 50),
        limit: topK,
        ...(vectorFilter ? { filter: vectorFilter } : {}),
      },
    },
    {
      $project: {
        _id: 0,
        sourceType: 1,
        sourceId: 1,
        title: 1,
        content: 1,
        metadata: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ];
  return KnowledgeDocument.aggregate(pipeline);
}

export function formatRetrievedContext(documents) {
  return documents.map((document, index) => `[Source ${index + 1}: ${document.title} | ${document.sourceType}:${document.sourceId}]\n${document.content}`).join('\n\n');
}

export function formatSources(documents) {
  return documents.map(({ sourceType, sourceId, title, metadata }) => ({ sourceType, sourceId, title, metadata }));
}

export { KNOWLEDGE_VERSION, VECTOR_INDEX };