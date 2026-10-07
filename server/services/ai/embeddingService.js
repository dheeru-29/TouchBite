const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
const EMBEDDING_DIMENSIONS = Number(process.env.GEMINI_EMBEDDING_DIMENSIONS) || 768;

function getEmbeddingApiKey() {
  const key = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  if (!key || !String(key).trim()) {
    throw new Error('Gemini API key is not configured for embeddings.');
  }
  return key;
}

export function getEmbeddingConfig() {
  return { model: EMBEDDING_MODEL, dimensions: EMBEDDING_DIMENSIONS };
}

export async function createEmbedding({ text, taskType = 'RETRIEVAL_DOCUMENT' }) {
  const value = String(text || '').trim();
  if (!value) throw new Error('Embedding text is required.');
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${getEmbeddingApiKey()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text: value }] },
        taskType,
        outputDimensionality: EMBEDDING_DIMENSIONS,
      }),
    }
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Embedding request failed: ${payload?.error?.message || 'Gemini embedding request failed.'}`);
  }
  const vector = payload?.embedding?.values;
  if (!Array.isArray(vector) || vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`Embedding provider returned an unexpected vector dimension; expected ${EMBEDDING_DIMENSIONS}.`);
  }
  return vector;
}