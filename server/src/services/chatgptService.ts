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

async function callChatGPT(prompt: string, jsonMode = false): Promise<string | null> {
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
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
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

// Minimum words needed before we consider content meaningful enough for GPT analysis.
// Below this threshold the model is forced to produce bullets from essentially nothing,
// which causes hallucination. floor(29/60) = 0, so the "3 bullet minimum" is 100% invented.
const MIN_WORDS_FOR_ANALYSIS = 30;

const BRIEF_BULLET = 'Recording was too brief to generate an analysis.';
const BRIEF_SENTENCE = 'This recording did not contain enough speech to generate a summary.';

function getOptimalBulletPoints(wordCount: number): number {
  return Math.min(7, Math.max(3, Math.floor(wordCount / 60)));
}

function normalizeBullets(text: string): string[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  // Strip any leading bullet/dash/number prefix GPT might add, regardless of Unicode variant
  return lines.map(l => l.replace(/^[\u2022\u2023\u2043\u25E6\u2014\u2013\-\*\d]+[.):]?\s*/, '').trim()).filter(Boolean);
}

async function getAllBulletSentiments(
  points: string[],
): Promise<{ sentiment: SentimentType; confidence: number }[]> {
  if (points.length === 0) return [];

  const prompt = `Analyze the sentiment of each health journal bullet point below.
Return a JSON object with a single key "results" containing an array of objects in the same order as the input.
Each object must have exactly:
- "sentiment": one of ["Very Negative", "Negative", "Neutral", "Positive", "Very Positive"]
- "confidence": an integer between 0 and 100

Guidelines:
- Very Positive: Clear health improvements (significant pain reduction, excellent sleep, high energy)
- Positive: Moderate improvements (manageable pain, decent sleep, good energy)
- Neutral: Factual statement unrelated to health/wellbeing
- Negative: Health difficulties (increased pain, poor sleep, fatigue, stress)
- Very Negative: Severe issues (extreme pain, insomnia, exhaustion, severe distress)

<bullets>
${points.map((p, i) => `${i + 1}. ${p}`).join('\n')}
</bullets>`;

  const response = await callChatGPT(prompt, true);
  if (!response) return points.map(() => ({ sentiment: 'Neutral' as SentimentType, confidence: 50 }));

  try {
    const parsed = JSON.parse(response);
    const results: any[] = Array.isArray(parsed.results) ? parsed.results : [];
    return points.map((_, i) => ({
      sentiment: (results[i]?.sentiment as SentimentType) || 'Neutral',
      confidence: typeof results[i]?.confidence === 'number' ? results[i].confidence : 50,
    }));
  } catch {
    return points.map(() => ({ sentiment: 'Neutral' as SentimentType, confidence: 50 }));
  }
}

export interface VideoAnalysisResult {
  tsOutputBullet: string;
  tsOutputSentence: string;
  weightedSentiment: WeightedSentimentResult;
}

export async function analyzeVideoTranscript(
  transcript: string,
  emotionStickers: string[],
  numericPainScale: number,
  textComments: string[],
): Promise<VideoAnalysisResult> {
  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;

  if (wordCount < MIN_WORDS_FOR_ANALYSIS) {
    return {
      tsOutputBullet: BRIEF_BULLET,
      tsOutputSentence: BRIEF_SENTENCE,
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

  const optimalBullets = getOptimalBulletPoints(wordCount);
  const painSentiment = getPainSentiment(numericPainScale);

  const commentsSection = textComments.length > 0
    ? `\n<text_comments>\n${textComments.map(c => {
        try { return JSON.parse(c).comment; } catch { return c; }
      }).filter(Boolean).join('\n')}\n</text_comments>`
    : '';

  const bulletPrompt = `Provide exactly ${optimalBullets} bullet points of the main topics in the health video transcript below.
PRIORITIZE wellbeing content: physical health, sleep, mood, energy, daily functioning.

<transcript>
${transcript}
</transcript>${commentsSection}`;

  const sentencePrompt = `Summarize the main topics in the health video transcript below in 2-3 concise sentences.

<transcript>
${transcript}
</transcript>${commentsSection}`;

  // Run bullet and sentence summaries in parallel
  const [rawBullet, sentence] = await Promise.all([
    callChatGPT(bulletPrompt),
    callChatGPT(sentencePrompt),
  ]);

  const bulletText = rawBullet || '';
  const bulletPoints = normalizeBullets(bulletText);

  // Get all bullet sentiments in a single batched API call
  const sentiments = await getAllBulletSentiments(bulletPoints);
  const bulletResults = bulletPoints.map((point, i) => ({ point, ...sentiments[i] }));

  const weightedSentiment = buildWeightedSentimentResult(
    bulletResults,
    painSentiment,
    emotionStickers,
  );

  const tsOutputBullet = bulletPoints.join('\n');

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
  const nonEmpty = transcripts.filter(t => t && t.trim().split(/\s+/).filter(Boolean).length >= MIN_WORDS_FOR_ANALYSIS);
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

  const bulletPrompt = `Summarize the following health video transcripts into exactly ${optimalBullets} high-impact bullet points.
Use a standard markdown list format.

<transcripts>
${nonEmpty.join('\n\n---\n\n')}
</transcripts>`;

  const sentencePrompt = `Summarize the following health video transcripts in 3-5 concise sentences.

<transcripts>
${nonEmpty.join('\n\n---\n\n')}
</transcripts>`;

  const [rawBullet, sentence] = await Promise.all([
    callChatGPT(bulletPrompt),
    callChatGPT(sentencePrompt),
  ]);

  const bulletPoints = normalizeBullets(rawBullet || '');

  // Aggregate pain bias
  const aggregatePainBias = painBiases.length > 0
    ? painBiases.reduce((s, v) => s + v, 0) / painBiases.length
    : 0;

  // Get all bullet sentiments in a single batched API call
  const sentiments = await getAllBulletSentiments(bulletPoints);
  const bulletResults = bulletPoints.map((point, i) => ({ point, ...sentiments[i] }));

  const weightedSentiment = buildWeightedSentimentResult(
    bulletResults,
    null,
    allEmotionStickers,
    aggregatePainBias,
  );

  return {
    summaryAnalysisBullet: bulletPoints.join('\n'),
    summaryAnalysisSentence: sentence || '',
    weightedSentiment,
  };
}

export async function generateVideoSummary(
  transcript: string,
): Promise<{ sentence: string; topics: string[] } | null> {
  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < MIN_WORDS_FOR_ANALYSIS) return null;

  const prompt = `Analyze this health journal transcript and return a JSON object with exactly two keys:
- "sentence": one concise sentence (15-20 words) summarizing the main health topics discussed
- "topics": an array of 3-5 short keyword strings (1-3 words each) covering the main topics

<transcript>
${transcript}
</transcript>`;

  const response = await callChatGPT(prompt, true);
  if (!response) return null;

  try {
    const parsed = JSON.parse(response);
    if (typeof parsed.sentence !== 'string' || !Array.isArray(parsed.topics)) return null;
    return {
      sentence: parsed.sentence.trim(),
      topics: (parsed.topics as any[]).filter(t => typeof t === 'string').slice(0, 5),
    };
  } catch {
    return null;
  }
}
