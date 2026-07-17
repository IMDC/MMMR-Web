import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IVideoData extends Omit<Document, 'isSelected'> {
  userId: Types.ObjectId;
  title: string;
  filename: string;
  datetimeRecorded: Date;
  duration: number;
  textComments: string[];
  locations: string[];       // JSON-encoded ReferenceItem[]
  emotionStickers: string[]; // JSON-encoded { sentiment, timestamp }[]
  keywords: string[];        // JSON-encoded ReferenceItem[]
  painScale: string[];       // JSON-encoded PainScaleItem[]
  numericScale: number;
  isTranscribed: boolean;
  isSelected: boolean;
  transcript: string;
  weekday: string;
  sentiment: string;
  biasAdjustedSentiment: string;
  sentimentScore: number;
  averageConfidence: number;
  tsOutputBullet: string;
  tsOutputSentence: string;
  bulletSentiments: string;  // JSON string
  flagged_for_harm: boolean;
  frequencyData: string;     // JSON string FrequencyMap
  bulletPointsLocked: boolean;
}

const VideoDataSchema = new Schema<IVideoData>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, default: () => new Date().toLocaleString() },
    filename: { type: String, required: true, unique: true },
    datetimeRecorded: { type: Date, default: Date.now },
    duration: { type: Number, required: true, default: 0 },
    textComments: { type: [String], default: [] },
    locations: { type: [String], default: [] },
    emotionStickers: { type: [String], default: [] },
    keywords: { type: [String], default: [] },
    painScale: { type: [String], default: [] },
    numericScale: { type: Number, default: 0 },
    isTranscribed: { type: Boolean, default: false },
    isSelected: { type: Boolean, default: false },
    transcript: { type: String, default: '' },
    weekday: { type: String, default: () => new Date().toString().split(' ')[0] },
    sentiment: { type: String, default: '' },
    biasAdjustedSentiment: { type: String, default: '' },
    sentimentScore: { type: Number, default: 0 },
    averageConfidence: { type: Number, default: 0 },
    tsOutputBullet: { type: String, default: '' },
    tsOutputSentence: { type: String, default: '' },
    bulletSentiments: { type: String, default: '' },
    flagged_for_harm: { type: Boolean, default: false },
    frequencyData: { type: String, default: '' },
    bulletPointsLocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const VideoData = mongoose.model<IVideoData>('VideoData', VideoDataSchema);
