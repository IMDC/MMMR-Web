import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IVideoSet extends Document {
  name: string;
  datetime: Date;
  videoIDs: Types.ObjectId[];
  summaryAnalysisSentence: string;
  summaryAnalysisBullet: string;
  isSummaryGenerated: boolean;
  reportFormat: 'bullet' | 'sentence';
  selectedWords: string[];
  earliestVideoDateTime: Date;
  latestVideoDateTime: Date;
  isFrequencyAnalyzed: boolean;
  isCurrent: boolean;
  combinedFrequencyData: string;
  aiOptedIn: boolean;
  sentiment: string;
  sentimentScore: number;
  averageConfidence: number;
  bulletSentiments: string;
}

const VideoSetSchema = new Schema<IVideoSet>(
  {
    name: { type: String, required: true },
    datetime: { type: Date, default: Date.now },
    videoIDs: [{ type: Schema.Types.ObjectId, ref: 'VideoData' }],
    summaryAnalysisSentence: { type: String, default: '' },
    summaryAnalysisBullet: { type: String, default: '' },
    isSummaryGenerated: { type: Boolean, default: false },
    reportFormat: { type: String, enum: ['bullet', 'sentence'], default: 'bullet' },
    selectedWords: { type: [String], default: [] },
    earliestVideoDateTime: { type: Date, default: Date.now },
    latestVideoDateTime: { type: Date, default: Date.now },
    isFrequencyAnalyzed: { type: Boolean, default: false },
    isCurrent: { type: Boolean, default: false },
    combinedFrequencyData: { type: String, default: '' },
    aiOptedIn: { type: Boolean, default: false },
    sentiment: { type: String, default: '' },
    sentimentScore: { type: Number, default: 0 },
    averageConfidence: { type: Number, default: 0 },
    bulletSentiments: { type: String, default: '' },
  },
  { timestamps: true }
);

export const VideoSet = mongoose.model<IVideoSet>('VideoSet', VideoSetSchema);
