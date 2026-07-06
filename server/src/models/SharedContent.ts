import mongoose, { Schema, Document } from 'mongoose';

const RecipientSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  type: { type: String, required: true }, // 'healthcare_provider', 'family', 'caregiver', 'other'
  relationship: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  dateAdded: { type: Date, default: Date.now },
  lastAccessed: { type: Date, default: Date.now },
}, { _id: false });

const SharingPermissionsSchema = new Schema({
  viewVideos: { type: Boolean, default: true },
  downloadVideos: { type: Boolean, default: false },
  viewTranscriptData: { type: Boolean, default: true },
  viewAnalyticsDashboard: { type: Boolean, default: true },
  allowComments: { type: Boolean, default: false },
  allowAnnotations: { type: Boolean, default: false },
  allowSharing: { type: Boolean, default: false },
}, { _id: false });

const SharingActivitySchema = new Schema({
  action: { type: String, required: true }, // 'shared', 'viewed', 'downloaded', 'commented', 'revoked'
  timestamp: { type: Date, default: Date.now },
  recipientId: { type: String, default: '' },
  recipientName: { type: String, default: '' },
  details: { type: String, default: '' },
}, { _id: false });

export interface ISharedContent extends Document {
  permissionId: string;
  contentType: string;
  contentId: string;
  contentName: string;
  recipients: any[];
  permissions: any;
  shareMessage: string;
  expireAfter: number;
  isActive: boolean;
  isDeactivating: boolean;
  dateCreated: Date;
  dateExpires: Date;
  accessCount: number;
  lastAccessed: Date;
  activities: any[];
  isPublic: boolean;
  publicAccessCode?: string;
  tags: string[];
}

const SharedContentSchema = new Schema<ISharedContent>(
  {
    permissionId: { type: String, required: true, unique: true },
    contentType: { type: String, required: true, enum: ['video', 'videoSet', 'analytics', 'report'] },
    contentId: { type: String, required: true },
    contentName: { type: String, required: true },
    recipients: { type: [RecipientSchema] as any, default: [] },
    permissions: { type: SharingPermissionsSchema as any, default: () => ({}) },
    shareMessage: { type: String, default: '' },
    expireAfter: { type: Number, default: 30 },
    isActive: { type: Boolean, default: true },
    isDeactivating: { type: Boolean, default: false },
    dateCreated: { type: Date, default: Date.now },
    dateExpires: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    accessCount: { type: Number, default: 0 },
    lastAccessed: { type: Date, default: Date.now },
    activities: { type: [SharingActivitySchema] as any, default: [] },
    isPublic: { type: Boolean, default: false },
    publicAccessCode: { type: String },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const SharedContent = mongoose.model<ISharedContent>('SharedContent', SharedContentSchema);
