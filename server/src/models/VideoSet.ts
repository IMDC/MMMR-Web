import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IVideoSet extends Document {
  userId: Types.ObjectId;
  name: string;
  datetime: Date;
  videoIDs: Types.ObjectId[];
  summaryAnalysisSentence: string;
  summaryAnalysisBullet: string;
  isSummaryGenerated: boolean;
  reportFormat: 'bullet' | 'sentence';
  aiOptedIn: boolean;
  sentiment: string;
  bulletSentiments: string;
}

const VideoSetSchema = new Schema<IVideoSet>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    datetime: { type: Date, default: Date.now },
    videoIDs: [{ type: Schema.Types.ObjectId, ref: 'VideoData' }],
    summaryAnalysisSentence: { type: String, default: '' },
    summaryAnalysisBullet: { type: String, default: '' },
    isSummaryGenerated: { type: Boolean, default: false },
    reportFormat: { type: String, enum: ['bullet', 'sentence'], default: 'bullet' },
    aiOptedIn: { type: Boolean, default: false },
    sentiment: { type: String, default: '' },
    bulletSentiments: { type: String, default: '' },
  },
  { timestamps: true }
);

export const VideoSet = mongoose.model<IVideoSet>('VideoSet', VideoSetSchema);
