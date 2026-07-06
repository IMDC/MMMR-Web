import mongoose from 'mongoose';
import { config } from './env';

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('MongoDB connected:', config.mongoUri);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}
