import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { menuItems } from '../../src/data/menu.js';
import { connectDatabase } from '../config/db.js';
import Product from '../models/Product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootEnv = path.resolve(__dirname, '../../.env');
const serverEnv = path.resolve(__dirname, '../.env');
if (process.env.MONGODB_URI) {
  // already configured; keep it as is
} else {
  dotenv.config({ path: rootEnv });
}
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: serverEnv });
}

async function seedMenu() {
  await connectDatabase();

  const operations = menuItems.map((item) => ({
    updateOne: {
      filter: { name: item.name },
      update: {
        $set: {
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          image: item.image,
          popular: item.popular,
          vegetarian: item.vegetarian,
          customizationOptions: item.options,
          available: true,
        },
      },
      upsert: true,
    },
  }));

  const result = await Product.bulkWrite(operations);

  console.log(
    `Menu seeded (${result.upsertedCount} created, ${result.modifiedCount} updated).`
  );

  process.exit(0);
}

seedMenu().catch((error) => {
  console.error(`Seeding failed: ${error.message}`);
  process.exit(1);
});