import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!/^mongodb\+srv:\/\/(?:[^@/?#]+@)?[^@/:?#]+\.mongodb\.net(?:\/|$)/i.test(uri ?? '')) {
    throw new Error('Set MONGODB_URI to a MongoDB Atlas SRV connection string in server/.env.');
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  } catch (error) {
    await disconnectDB();
    throw error;
  }
  console.log(`[MongoDB] Connected to database: ${mongoose.connection.name}`);
};

export const disconnectDB = () => mongoose.disconnect();

export const pingDB = async () => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB is disconnected.');
  }
  await mongoose.connection.db.command({ ping: 1 }, { timeoutMS: 2000 });
};
