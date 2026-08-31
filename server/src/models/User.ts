import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  passwordHash: string;
  displayName: string;
  aiConsent: 'agreed' | 'disagreed' | null;
  autoTranscribe: boolean | null;
  summaryFormat: 'sentence' | 'chips' | 'both';
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    displayName: { type: String, default: '' },
    aiConsent: { type: String, enum: ['agreed', 'disagreed', null], default: null },
    autoTranscribe: { type: Boolean, default: null },
    summaryFormat: { type: String, enum: ['sentence', 'chips', 'both'], default: 'both' },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
