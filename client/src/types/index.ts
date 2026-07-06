// Shared TypeScript interfaces mirroring the MongoDB schemas

export interface Video {
  _id: string;
  title: string;
  filename: string;
  datetimeRecorded: string;
  duration: number;
  textComments: string[];
  locations: string[];
  emotionStickers: string[];
  keywords: string[];
  painScale: string[];
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
  bulletSentiments: string;
  flagged_for_harm: boolean;
  frequencyData: string;
  bulletPointsLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VideoSet {
  _id: string;
  name: string;
  datetime: string;
  videoIDs: string[];
  summaryAnalysisSentence: string;
  summaryAnalysisBullet: string;
  isSummaryGenerated: boolean;
  reportFormat: 'bullet' | 'sentence';
  selectedWords: string[];
  earliestVideoDateTime: string;
  latestVideoDateTime: string;
  isFrequencyAnalyzed: boolean;
  isCurrent: boolean;
  combinedFrequencyData: string;
  aiOptedIn: boolean;
  sentiment: string;
  sentimentScore: number;
  averageConfidence: number;
  bulletSentiments: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  _id: string;
  name: string;
  email: string;
  type: string;
  relationship: string;
  isActive: boolean;
  dateCreated: string;
  lastModified: string;
}

export interface SharingPermissions {
  viewVideos: boolean;
  downloadVideos: boolean;
  viewTranscriptData: boolean;
  viewAnalyticsDashboard: boolean;
  allowComments: boolean;
  allowAnnotations: boolean;
  allowSharing: boolean;
}

export interface Recipient {
  id: string;
  name: string;
  email: string;
  type: string;
  relationship: string;
  isActive: boolean;
  dateAdded: string;
  lastAccessed: string;
}

export interface SharingActivity {
  action: string;
  timestamp: string;
  actorId?: string;
  actorName?: string;
}

export interface SharedContent {
  _id: string;
  permissionId: string;
  contentType: string;
  contentId: string;
  contentName: string;
  recipients: Recipient[];
  permissions: SharingPermissions;
  shareMessage: string;
  expireAfter: number;
  isActive: boolean;
  isDeactivating: boolean;
  dateCreated: string;
  createdAt: string;
  dateExpires: string;
  accessCount: number;
  lastAccessed: string;
  isPublic: boolean;
  publicAccessCode?: string;
  tags: string[];
  activities: SharingActivity[];
}

export type SentimentType =
  | 'Very Negative'
  | 'Negative'
  | 'Neutral'
  | 'Positive'
  | 'Very Positive';

export interface BulletSentiment {
  point: string;
  sentiment: SentimentType;
  weight: number;
  confidence: number;
}

export interface FrequencyPoint {
  text: string;
  value: number;
}

export interface TranscriptionProgress {
  stage: string;
  progress: number;
  message: string;
  data?: any;
}

// Reference data types (no Realm BSON IDs — use plain strings)
export interface ReferenceItem {
  id: string;
  value: number;
  title: string;
  checked?: boolean;
}

export interface PainScaleItem {
  id: string;
  name: string;
  severity_level: string;
}

export interface EmotionSticker {
  sentiment: 'smile' | 'neutral' | 'worried' | 'sad' | 'angry';
  timestamp: string;
}
