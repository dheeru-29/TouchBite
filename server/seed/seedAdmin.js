import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { connectDatabase } from '../config/db.js';
import Admin from '../models/Admin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootEnv = path.resolve(__dirname, '../../.env');
const serverEnv = path.resolve(__dirname, '../.env');
if (!process.env.MONGODB_URI) dotenv.config({ path: rootEnv });
if (!process.env.MONGODB_URI) dotenv.config({ path: serverEnv });

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'TouchBite Manager';

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in your .env before running this script.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('ADMIN_PASSWORD should be at least 8 characters.');
    process.exit(1);
  }

  await connectDatabase();

  const passwordHash = await Admin.hashPassword(password);
  const admin = await Admin.findOneAndUpdate(
    { email: email.trim().toLowerCase() },
    { $set: { name, passwordHash } },
    { upsert: true, new: true }
  );

  console.log(`Admin account ready: ${admin.email}`);
  process.exit(0);
}

seedAdmin().catch((error) => {
  console.error(`Admin seeding failed: ${error.message}`);
  process.exit(1);
});
