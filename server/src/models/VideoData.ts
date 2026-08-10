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
  painKeyword: string[];     // JSON-encoded PainScaleItem[]
  numericPainScale: number;
  isTranscribed: boolean;
  transcript: string;
  sentiment: string;
  biasAdjustedSentiment: string;
  tsOutputBullet: string;
  tsOutputSentence: string;
  bulletSentiments: string;  // JSON string
  flagged_for_harm: boolean;
  frequencyData: string;     // JSON string FrequencyMap
  bulletPointsLocked: boolean;
  videoSummary: string;
  videoTopics: string[];
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
    painKeyword: { type: [String], default: [] },
    numericPainScale: { type: Number, default: 0 },
    isTranscribed: { type: Boolean, default: false },
    transcript: { type: String, default: '' },
    sentiment: { type: String, default: '' },
    biasAdjustedSentiment: { type: String, default: '' },
    tsOutputBullet: { type: String, default: '' },
    tsOutputSentence: { type: String, default: '' },
    bulletSentiments: { type: String, default: '' },
    flagged_for_harm: { type: Boolean, default: false },
    frequencyData: { type: String, default: '' },
    bulletPointsLocked: { type: Boolean, default: false },
    videoSummary: { type: String, default: '' },
    videoTopics: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const VideoData = mongoose.model<IVideoData>('VideoData', VideoDataSchema);
