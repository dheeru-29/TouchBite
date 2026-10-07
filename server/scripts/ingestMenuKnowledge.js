import '../config/env.js';
import { connectDatabase } from '../config/db.js';
import Product from '../models/Product.js';
import { upsertProductKnowledge } from '../services/ai/ragService.js';

async function ingestMenuKnowledge() {
  await connectDatabase();
  const products = await Product.find({}).lean();
  let processed = 0;
  for (const product of products) {
    await upsertProductKnowledge(product);
    processed += 1;
    console.log(`Knowledge indexed: ${product.name}`);
  }
  console.log(`Menu knowledge ingestion complete (${processed} products).`);
  process.exit(0);
}

ingestMenuKnowledge().catch((error) => {
  console.error(`Knowledge ingestion failed: ${error.message}`);
  process.exit(1);
});