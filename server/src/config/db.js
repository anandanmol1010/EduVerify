import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let mongodInstance = null;

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/eduverify';
    
    // Attempt local connection with a short timeout first
    try {
      const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 2000,
      });
      console.log(`[MongoDB] Connected to database: ${conn.connection.host}`);
      return conn;
    } catch (localErr) {
      console.warn(`[MongoDB] Local MongoDB connection failed (${localErr.message}). Starting in-memory MongoDB instance for self-contained execution...`);
      
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create({
        instance: {
          dbName: 'eduverify'
        }
      });
      const memoryUri = mongodInstance.getUri();
      console.log(`[MongoDB] In-Memory MongoDB running at: ${memoryUri}`);
      
      const conn = await mongoose.connect(memoryUri);
      console.log(`[MongoDB] Connected to in-memory database successfully.`);
      return conn;
    }
  } catch (error) {
    console.error(`[MongoDB] Error initializing database: ${error.message}`);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongodInstance) {
      await mongodInstance.stop();
    }
  } catch (err) {
    console.error(`[MongoDB] Error disconnecting: ${err.message}`);
  }
};
