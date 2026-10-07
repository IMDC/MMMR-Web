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
  detectedPhrases: string[];
  harmFlagDismissed: boolean;
  frequencyData: string;     // JSON string FrequencyMap
  bulletPointsLocked: boolean;
  markupsChangedSinceAnalysis: boolean;
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
    // The matched crisis keywords, kept so the warning dialog can be
    // reopened from a flagged video without re-running detection.
    detectedPhrases: { type: [String], default: [] },
    // Set when the participant says the flag was wrong. The detection result
    // above is deliberately left intact so the study can still measure how
    // often the detector was wrong; only the UI treats the video as normal.
    harmFlagDismissed: { type: Boolean, default: false },
    frequencyData: { type: String, default: '' },
    bulletPointsLocked: { type: Boolean, default: false },
    // Set when pain, emotions or text comments are edited after the video has
    // been analyzed. The stored sentiment then describes markups that no longer
    // exist, so the UI can say so and point at Regenerate All. Cleared by every
    // analysis write. Deliberately does NOT trigger re-analysis: a conflict is
    // an analysis result and only surfaces when analysis runs.
    markupsChangedSinceAnalysis: { type: Boolean, default: false },
    videoSummary: { type: String, default: '' },
    videoTopics: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const VideoData = mongoose.model<IVideoData>('VideoData', VideoDataSchema);
