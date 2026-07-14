import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/mhmr',
  openAiKey: process.env.API_OPENAI_CHATGPT || '',
  ibmWatsonKey: process.env.API_KEY_SPEECH_TO_TEXT || '',
  uploadsDir: path.resolve(process.env.UPLOADS_DIR || './server/uploads/videos'),
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '500', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
};
