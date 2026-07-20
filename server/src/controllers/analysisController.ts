import { Request, Response } from 'express';
import { VideoData } from '../models/VideoData';
import { VideoSet } from '../models/VideoSet';
import { analyzeVideoTranscript, analyzeVideoSet } from '../services/chatgptService';
import {
  FrequencyData,
  formatForBarGraph,
  formatForWordCloud,
  getWordListForDropdown,
  calculateLineGraphData,
  processTranscriptToFrequency,
} from '../services/frequencyService';
import { getPainSentiment, getPainBias } from '../services/sentimentService';

export async function analyzeVideo(req: Request, res: Response) {
  const { videoId, skipTextReports } = req.body;
  if (!videoId) return res.status(400).json({ error: 'videoId is required' });

  const video = await VideoData.findOne({ _id: videoId, userId: req.userId });
  if (!video) return res.status(404).json({ error: 'Video not found' });

  if (!video.transcript || !video.transcript.trim()) {
    return res.status(400).json({ error: 'Video has no transcript yet. Transcribe it first.' });
  }

  if (skipTextReports) {
    // Sentiment only — no bullet/sentence generation
    const { analyzeVideoTranscript: analyze } = await import('../services/chatgptService');
    const result = await analyze(
      video.transcript,
      Array.from(video.emotionStickers || []),
      video.numericScale,
      Array.from(video.textComments || []),
    );

    await VideoData.findByIdAndUpdate(videoId, {
      sentiment: result.weightedSentiment.overallSentiment,
      biasAdjustedSentiment: result.weightedSentiment.overallSentiment,
      sentimentScore: result.weightedSentiment.averageScore,
      averageConfidence: result.weightedSentiment.averageConfidence,
      bulletSentiments: JSON.stringify(result.weightedSentiment.bulletSentiments),
    });

    return res.json({ sentiment: result.weightedSentiment.overallSentiment });
  }

  const result = await analyzeVideoTranscript(
    video.transcript,
    Array.from(video.emotionStickers || []),
    video.numericScale,
    Array.from(video.textComments || []),
  );

  // Single consolidated update — fixes the duplicate-write bug from mobile
  await VideoData.findByIdAndUpdate(videoId, {
    tsOutputBullet: result.tsOutputBullet,
    tsOutputSentence: result.tsOutputSentence,
    sentiment: result.weightedSentiment.overallSentiment,
    biasAdjustedSentiment: result.weightedSentiment.overallSentiment,
    sentimentScore: result.weightedSentiment.averageScore,
    averageConfidence: result.weightedSentiment.averageConfidence,
    bulletSentiments: JSON.stringify(result.weightedSentiment.bulletSentiments),
    bulletPointsLocked: true,
    isTranscribed: true,
  });

  res.json({
    tsOutputBullet: result.tsOutputBullet,
    tsOutputSentence: result.tsOutputSentence,
    sentiment: result.weightedSentiment.overallSentiment,
    sentimentScore: result.weightedSentiment.averageScore,
    bulletSentiments: result.weightedSentiment.bulletSentiments,
    conflictDetected: result.weightedSentiment.conflictDetected,
    userSentiment: result.weightedSentiment.userSentiment,
    aiSentiment: result.weightedSentiment.aiSentiment,
  });
}

export async function analyzeVideoSetSummary(req: Request, res: Response) {
  const { videoSetId } = req.body;
  if (!videoSetId) return res.status(400).json({ error: 'videoSetId is required' });

  const set = await VideoSet.findOne({ _id: videoSetId, userId: req.userId });
  if (!set) return res.status(404).json({ error: 'Video set not found' });

  const videos = await VideoData.find({ _id: { $in: set.videoIDs } });

  // Analyze each video individually so tsOutputBullet / tsOutputSentence / sentiment
  // are written to VideoData — mirrors the Android per-video analysis flow.
  for (const video of videos) {
    if (!video.transcript?.trim()) continue;
    const perVideo = await analyzeVideoTranscript(
      video.transcript,
      Array.from(video.emotionStickers || []),
      video.numericScale,
      Array.from(video.textComments || []),
    );
    await VideoData.findByIdAndUpdate(video._id, {
      tsOutputBullet: perVideo.tsOutputBullet,
      tsOutputSentence: perVideo.tsOutputSentence,
      sentiment: perVideo.weightedSentiment.overallSentiment,
      biasAdjustedSentiment: perVideo.weightedSentiment.overallSentiment,
      sentimentScore: perVideo.weightedSentiment.averageScore,
      averageConfidence: perVideo.weightedSentiment.averageConfidence,
      bulletSentiments: JSON.stringify(perVideo.weightedSentiment.bulletSentiments),
      bulletPointsLocked: true,
    });
    // Update local reference so set-level aggregation uses fresh data
    video.sentiment = perVideo.weightedSentiment.overallSentiment;
  }

  const transcripts = videos.map(v => v.transcript || '');
  const allStickers = videos.flatMap(v => Array.from(v.emotionStickers || []));
  const painBiases = videos.map(v => getPainBias(getPainSentiment(v.numericScale)));

  const result = await analyzeVideoSet(transcripts, allStickers, painBiases);

  await VideoSet.findByIdAndUpdate(videoSetId, {
    summaryAnalysisBullet: result.summaryAnalysisBullet,
    summaryAnalysisSentence: result.summaryAnalysisSentence,
    isSummaryGenerated: true,
    sentiment: result.weightedSentiment.overallSentiment,
    sentimentScore: result.weightedSentiment.averageScore,
    averageConfidence: result.weightedSentiment.averageConfidence,
    bulletSentiments: JSON.stringify(result.weightedSentiment.bulletSentiments),
  });

  res.json({
    summaryAnalysisBullet: result.summaryAnalysisBullet,
    summaryAnalysisSentence: result.summaryAnalysisSentence,
    sentiment: result.weightedSentiment.overallSentiment,
    bulletSentiments: result.weightedSentiment.bulletSentiments,
    conflictDetected: result.weightedSentiment.conflictDetected,
  });
}

export async function getFrequencyData(req: Request, res: Response) {
  const { videoSetId } = req.params;
  const minCount = parseInt(req.query.minCount as string || '2', 10);

  const set = await VideoSet.findOne({ _id: videoSetId, userId: req.userId });
  if (!set) return res.status(404).json({ error: 'Video set not found' });

  const videos = await VideoData.find({
    _id: { $in: set.videoIDs },
    isTranscribed: true,
  });

  const freqMaps: FrequencyData[] = videos
    .filter(v => v.frequencyData)
    .map(v => {
      try {
        const raw = JSON.parse(v.frequencyData) as Record<string, number>;
        // Apply minCount filter
        const filtered: Record<string, number> = {};
        for (const [word, count] of Object.entries(raw)) {
          if (count >= minCount) filtered[word] = count;
        }
        return {
          map: filtered,
          datetime: v.datetimeRecorded.toISOString(),
          videoID: v._id.toString(),
        };
      } catch {
        return null;
      }
    })
    .filter((x): x is FrequencyData => x !== null);

  const barData = formatForBarGraph(freqMaps);
  const wordCloudData = formatForWordCloud(freqMaps);
  const wordList = getWordListForDropdown(freqMaps);

  res.json({ barData, wordCloudData, wordList, freqMaps });
}

export async function getLineGraphData(req: Request, res: Response) {
  const { videoSetId } = req.params;
  const word = req.query.word as string;
  if (!word) return res.status(400).json({ error: 'word query param is required' });

  const set = await VideoSet.findOne({ _id: videoSetId, userId: req.userId });
  if (!set) return res.status(404).json({ error: 'Video set not found' });

  const videos = await VideoData.find({
    _id: { $in: set.videoIDs },
    isTranscribed: true,
  }).sort({ datetimeRecorded: 1 });

  const freqMaps: FrequencyData[] = videos
    .filter(v => v.frequencyData)
    .map(v => {
      try {
        return {
          map: JSON.parse(v.frequencyData),
          datetime: v.datetimeRecorded.toISOString(),
          videoID: v._id.toString(),
        };
      } catch {
        return null;
      }
    })
    .filter((x): x is FrequencyData => x !== null);

  const data = calculateLineGraphData(freqMaps, word);
  res.json(data);
}

export async function reprocessFrequency(req: Request, res: Response) {
  const { videoId } = req.body;
  if (!videoId) return res.status(400).json({ error: 'videoId is required' });

  const video = await VideoData.findOne({ _id: videoId, userId: req.userId });
  if (!video) return res.status(404).json({ error: 'Video not found' });

  const freqMap = processTranscriptToFrequency(video.transcript, 1);
  await VideoData.findByIdAndUpdate(videoId, { frequencyData: JSON.stringify(freqMap) });

  res.json({ frequencyData: freqMap });
}
