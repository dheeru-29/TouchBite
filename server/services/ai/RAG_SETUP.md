# TouchBite RAG setup

## Embeddings

The implementation uses Gemini `gemini-embedding-001` with 768 dimensions.
The embedding model and dimension are configured by:

```env
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
GEMINI_EMBEDDING_DIMENSIONS=768
```

The same dimension must be used by the MongoDB Atlas Vector Search index.

## Atlas Vector Search index

Create a Search index on the database collection named `knowledgedocuments`.
Use JSON editor mode with this definition and name the index
`touchbite_knowledge_vector`:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "metadata.category"
    }
  ]
}
```

The index name can be changed with `MONGODB_VECTOR_INDEX`.

## Ingestion

From the repository root, run:

```powershell
npm --prefix server run ingest:knowledge
```

The script reads every Product, creates a knowledge document from fields that
actually exist in the schema, embeds it, and upserts it by product ID and
knowledge version. It is safe to run repeatedly.

## Retrieval behavior

Knowledge questions use Atlas `$vectorSearch` with a top-K of 4. Retrieved
documents and source metadata are returned under `data.rag.sources`. Current
price and availability remain on the Phase 2 structured MongoDB path.

The Product model currently has no ingredient, allergen, nutrition, or
preparation fields. RAG therefore does not invent those values and answers that
the information is unavailable when the retrieved data cannot establish it.