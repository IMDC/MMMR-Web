import mongoose, { Schema, Document } from 'mongoose';

export interface IContact extends Document {
  name: string;
  email: string;
  type: string;
  relationship: string;
  isActive: boolean;
  dateCreated: Date;
  lastModified: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    type: { type: String, required: true },
    relationship: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    dateCreated: { type: Date, default: Date.now },
    lastModified: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const Contact = mongoose.model<IContact>('Contact', ContactSchema);
