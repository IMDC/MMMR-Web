// ChatGPT service — proxies OpenAI API calls server-side (API key never exposed to browser)
// Fixed vs mobile: no global mutable alertQueue, clean linear pipeline, single DB write

import { config } from '../config/env';
import {
  SentimentType,
  buildWeightedSentimentResult,
  WeightedSentimentResult,
  getPainSentiment,
  getPainBias,
} from './sentimentService';

async function callChatGPT(prompt: string): Promise<string | null> {
  if (!config.openAiKey) {
    console.error('OpenAI API key not configured');
    return null;
  }
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.openAiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'You are summarizing transcripts of video health journals. Do not use personal pronouns or identifiers. Focus solely on the information presented.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error(`OpenAI API error ${response.status}:`, err);
      return null;
    }

    const data: any = await response.json();
    return data?.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (error) {
    console.error('ChatGPT connection error:', error);
    return null;
  }
}

function getOptimalBulletPoints(wordCount: number): number {
  return Math.min(7, Math.max(3, Math.floor(wordCount / 60)));
}

function normalizeBullets(text: string): string[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const bulletLines = lines.map(l => l.match(/^[-*•]\s*(.+)$/)?.[1]?.trim() || '').filter(Boolean);
  if (bulletLines.length > 0) return bulletLines;

  // Fallback: treat as sentences
  return text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
}

async function getSentimentForBullet(
  point: string,
): Promise<{ sentiment: SentimentType; confidence: number }> {
  const prompt = `Analyze the sentiment of this health journal point and return exactly:
Sentiment: [Very Negative/Negative/Neutral/Positive/Very Positive]
Confidence: [0-100]

Guidelines:
- Very Positive: Clear health improvements (significant pain reduction, excellent sleep, high energy)
- Positive: Moderate improvements (manageable pain, decent sleep, good energy)
- Neutral: Factual statement unrelated to health/wellbeing
- Negative: Health difficulties (increased pain, poor sleep, fatigue, stress)
- Very Negative: Severe issues (extreme pain, insomnia, exhaustion, severe distress)

Point: "${point}"`;

  const response = await callChatGPT(prompt);
  if (!response) return { sentiment: 'Neutral', confidence: 50 };

  const sentimentMatch = response.match(/Sentiment:\s*(Very Negative|Negative|Neutral|Positive|Very Positive)/i);
  const confidenceMatch = response.match(/Confidence:\s*(\d+)/);

  return {
    sentiment: (sentimentMatch?.[1] as SentimentType) || 'Neutral',
    confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : 50,
  };
}

export interface VideoAnalysisResult {
  tsOutputBullet: string;
  tsOutputSentence: string;
  weightedSentiment: WeightedSentimentResult;
}

export async function analyzeVideoTranscript(
  transcript: string,
  emotionStickers: string[],
  numericScale: number,
  textComments: string[],
): Promise<VideoAnalysisResult> {
  const wordCount = transcript.split(' ').length;
  const optimalBullets = getOptimalBulletPoints(wordCount);
  const maxSummaryWords = Math.ceil(wordCount * 0.2);
  const painSentiment = getPainSentiment(numericScale);

  const commentsContext = textComments.length > 0
    ? `The patient also added these text comments: ${textComments.map(c => {
        try { return JSON.parse(c).comment; } catch { return c; }
      }).filter(Boolean).join(', ')}. `
    : '';

  const bulletPrompt = `${commentsContext}Provide exactly ${optimalBullets} bullet points of the main topics in this health video transcript: "${transcript}".
PRIORITIZE wellbeing content: physical health, sleep, mood, energy, daily functioning.
ONLY use the • character (Unicode U+2022) to begin each bullet point.`;

  const sentencePrompt = `${commentsContext}Summarize the main topics in this health video transcript in ${maxSummaryWords} words or less using sentences: "${transcript}"`;

  // Run bullet and sentence summaries in parallel
  const [rawBullet, sentence] = await Promise.all([
    callChatGPT(bulletPrompt),
    callChatGPT(sentencePrompt),
  ]);

  const bulletText = rawBullet || '';
  const bulletPoints = normalizeBullets(bulletText);

  // Get per-bullet sentiment in parallel
  const bulletResults = await Promise.all(
    bulletPoints.map(async point => {
      const result = await getSentimentForBullet(point);
      return { point, ...result };
    }),
  );

  const weightedSentiment = buildWeightedSentimentResult(
    bulletResults,
    painSentiment,
    emotionStickers,
  );

  // Format bullet output with • prefix
  const tsOutputBullet = bulletPoints.map(p => `• ${p}`).join('\n');

  return {
    tsOutputBullet,
    tsOutputSentence: sentence || '',
    weightedSentiment,
  };
}

export interface VideoSetAnalysisResult {
  summaryAnalysisBullet: string;
  summaryAnalysisSentence: string;
  weightedSentiment: WeightedSentimentResult;
}

export async function analyzeVideoSet(
  transcripts: string[],
  allEmotionStickers: string[],
  painBiases: number[],
): Promise<VideoSetAnalysisResult> {
  const nonEmpty = transcripts.filter(t => t && t.trim());
  if (nonEmpty.length === 0) {
    return {
      summaryAnalysisBullet: '',
      summaryAnalysisSentence: '',
      weightedSentiment: {
        overallSentiment: 'Neutral',
        bulletSentiments: [],
        averageScore: 0,
        averageConfidence: 0,
        conflictDetected: false,
        userSentiment: 'Neutral',
        aiSentiment: 'Neutral',
      },
    };
  }

  const combined = nonEmpty.join(' ');
  const wordCount = combined.split(' ').length;
  const optimalBullets = getOptimalBulletPoints(wordCount);
  const maxWords = Math.ceil(wordCount * 0.2);

  const bulletPrompt = `Summarize the following health video transcripts into exactly ${optimalBullets} high-impact bullet points (${maxWords} words or less total). ONLY use • for bullets: ${nonEmpty.join(' | ')}`;
  const sentencePrompt = `Summarize the following health video transcripts into a concise summary (${maxWords} words or less) in sentence form: ${nonEmpty.join(' | ')}`;

  const [rawBullet, sentence] = await Promise.all([
    callChatGPT(bulletPrompt),
    callChatGPT(sentencePrompt),
  ]);

  const bulletPoints = normalizeBullets(rawBullet || '');

  // Aggregate pain bias
  const aggregatePainBias = painBiases.length > 0
    ? painBiases.reduce((s, v) => s + v, 0) / painBiases.length
    : 0;

  // Per-bullet sentiment
  const bulletResults = await Promise.all(
    bulletPoints.map(async point => {
      const result = await getSentimentForBullet(point);
      return { point, ...result };
    }),
  );

  const weightedSentiment = buildWeightedSentimentResult(
    bulletResults,
    null,
    allEmotionStickers,
    aggregatePainBias,
  );

  return {
    summaryAnalysisBullet: bulletPoints.map(p => `• ${p}`).join('\n'),
    summaryAnalysisSentence: sentence || '',
    weightedSentiment,
  };
}
