import dns from 'node:dns';
import mongoose from 'mongoose';

// Node's default DNS resolver is refusing MongoDB Atlas SRV lookups
// on this network. Use public DNS resolvers for Atlas discovery.
dns.setServers(['8.8.8.8', '8.8.4.4']);

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      'MONGODB_URI is not configured. Copy .env.example to .env and add a connection string.'
    );
  }

  await mongoose.connect(uri);

  console.log(`MongoDB connected: ${mongoose.connection.host}`);
}