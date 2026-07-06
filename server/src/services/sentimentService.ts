// Sentiment service — ported from mobile chatgpt_api.tsx and calculateBiasAdjustedSentiment.ts
// Fixed: no global mutable state, single write per video, clean linear pipeline

export type SentimentType =
  | 'Very Negative'
  | 'Negative'
  | 'Neutral'
  | 'Positive'
  | 'Very Positive';

export const SENTIMENT_WEIGHTS: Record<SentimentType, number> = {
  'Very Negative': -2,
  'Negative': -1,
  'Neutral': 0,
  'Positive': 1,
  'Very Positive': 2,
};

export function scoreToSentiment(score: number): SentimentType {
  if (score <= -1.0) return 'Very Negative';
  if (score <= -0.25) return 'Negative';
  if (score < 0.25) return 'Neutral';
  if (score < 1.0) return 'Positive';
  return 'Very Positive';
}

export function getPainSentiment(painValue: number): string {
  if (painValue < 0.5) return 'no pain';
  if (painValue < 1.5) return 'mild pain';
  if (painValue < 2.5) return 'moderate pain';
  return 'severe pain';
}

export function getPainBias(painSentiment: string): number {
  switch (painSentiment?.toLowerCase()) {
    case 'severe pain': return -0.8;
    case 'moderate pain': return -0.5;
    case 'mild pain': return -0.2;
    case 'no pain': return 0.2;
    default: return 0;
  }
}

export function getEmotionBias(emotionStickers: string[]): number {
  if (!emotionStickers || emotionStickers.length === 0) return 0;

  const emotionWeights: Record<string, number> = {
    smile: 0.32,
    neutral: 0,
    worried: -0.09,
    sad: -0.3,
    angry: -0.26,
  };

  let total = 0;
  let count = 0;

  for (const stickerStr of emotionStickers) {
    try {
      const sticker = typeof stickerStr === 'string' ? JSON.parse(stickerStr) : stickerStr;
      const sentiment = (sticker?.sentiment || '').toLowerCase();
      const weight = emotionWeights[sentiment];
      if (weight !== undefined) {
        total += weight;
        count++;
      }
    } catch {
      // skip malformed sticker
    }
  }

  if (count === 0) return 0;
  const avg = total / count;
  return Math.max(-0.5, Math.min(0.5, avg));
}

export function detectSentimentDifference(
  aiSentiment: SentimentType,
  userSentiment: SentimentType,
): boolean {
  const polarity: Record<SentimentType, number> = {
    'Very Negative': -1.0,
    'Negative': -0.5,
    'Neutral': 0,
    'Positive': 0.5,
    'Very Positive': 1.0,
  };
  const ai = polarity[aiSentiment];
  const user = polarity[userSentiment];
  return (ai > 0 && user < 0 || ai < 0 && user > 0) &&
    Math.abs(ai) >= 0.5 && Math.abs(user) >= 0.5;
}

export function calculateUserSentiment(
  painSentiment: string | null,
  emotionStickers: string[],
): SentimentType {
  let score = getPainBias(painSentiment || '');
  score += getEmotionBias(emotionStickers);
  return scoreToSentiment(score);
}

export interface WeightedSentimentResult {
  overallSentiment: SentimentType;
  bulletSentiments: Array<{ point: string; sentiment: SentimentType; weight: number; confidence: number }>;
  averageScore: number;
  averageConfidence: number;
  conflictDetected: boolean;
  userSentiment: SentimentType;
  aiSentiment: SentimentType;
}

export function buildWeightedSentimentResult(
  bulletResults: Array<{ point: string; sentiment: SentimentType; confidence: number }>,
  painSentiment: string | null,
  emotionStickers: string[],
  painBiasOverride?: number,
): WeightedSentimentResult {
  if (bulletResults.length === 0) {
    return {
      overallSentiment: 'Neutral',
      bulletSentiments: [],
      averageScore: 0,
      averageConfidence: 0,
      conflictDetected: false,
      userSentiment: 'Neutral',
      aiSentiment: 'Neutral',
    };
  }

  const bulletSentiments = bulletResults.map(r => ({
    point: r.point,
    sentiment: r.sentiment,
    weight: SENTIMENT_WEIGHTS[r.sentiment],
    confidence: r.confidence,
  }));

  const aiOnlyScore = bulletSentiments.reduce((sum, b) => sum + b.weight, 0) / bulletSentiments.length;
  const aiSentiment = scoreToSentiment(aiOnlyScore);
  const userSentiment = calculateUserSentiment(painSentiment, emotionStickers);
  const conflictDetected = detectSentimentDifference(aiSentiment, userSentiment);

  const painBias = painBiasOverride !== undefined ? painBiasOverride : getPainBias(painSentiment || '');
  const emotionBias = getEmotionBias(emotionStickers);
  const averageScore = Math.max(-2, Math.min(2, aiOnlyScore + painBias + emotionBias));
  const averageConfidence = bulletSentiments.reduce((s, b) => s + b.confidence, 0) / bulletSentiments.length;

  return {
    overallSentiment: scoreToSentiment(averageScore),
    bulletSentiments,
    averageScore,
    averageConfidence,
    conflictDetected,
    userSentiment,
    aiSentiment,
  };
}
