import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoMemoryServer = null;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (uri) {
    try {
      console.log(`[MongoDB] Connecting to configured URI: ${uri}`);
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
      console.log('[MongoDB] Connected successfully to configured MongoDB instance.');
      return;
    } catch (err) {
      console.warn(`[MongoDB] Failed to connect to configured URI (${err.message}). Falling back to embedded MongoMemoryServer...`);
    }
  } else {
    // Try standard localhost first
    try {
      console.log('[MongoDB] Attempting connection to local MongoDB at mongodb://127.0.0.1:27017/agentic_dating ...');
      await mongoose.connect('mongodb://127.0.0.1:27017/agentic_dating', { serverSelectionTimeoutMS: 2000 });
      console.log('[MongoDB] Connected to local MongoDB.');
      return;
    } catch (err) {
      console.log('[MongoDB] Local MongoDB daemon not detected. Launching in-memory embedded MongoDB server for demo...');
    }
  }

  // Graceful fallback to MongoMemoryServer
  try {
    mongoMemoryServer = await MongoMemoryServer.create();
    const memUri = mongoMemoryServer.getUri();
    await mongoose.connect(memUri);
    console.log(`[MongoDB] In-memory MongoDB initialized and connected at: ${memUri}`);
  } catch (memErr) {
    console.error('[MongoDB] Fatal error initializing MongoDB:', memErr);
    throw memErr;
  }
};
