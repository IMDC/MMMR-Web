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
  hiddenWords: string[];
  barGraphMinCount: number;
  wordCloudPalette: string;
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
    // Word Settings, stored per set so a participant's curation survives
    // leaving the page — these were component state and reset on every visit.
    // Shared by the bar graph and the word cloud: the list means "words to
    // leave out of this set's analysis", so removing one hides it in both.
    hiddenWords: { type: [String], default: [] },
    // Page-specific, because they describe how one chart is drawn rather than
    // which words belong in the set.
    barGraphMinCount: { type: Number, default: 2, min: 1 },
    wordCloudPalette: { type: String, default: 'IBM' },
  },
  { timestamps: true }
);

export const VideoSet = mongoose.model<IVideoSet>('VideoSet', VideoSetSchema);
