import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { VideoData } from '../models/VideoData';
import { VideoSet } from '../models/VideoSet';
import { streamVideo } from '../utils/streamHelpers';
import { userUploadDir } from '../utils/userPaths';
import { transcribeVideo, TranscriptionStage } from '../services/transcriptionService';
import { getVideoDuration } from '../services/ffmpegService';

export async function listVideos(req: Request, res: Response) {
  const limit = parseInt(req.query.limit as string || '100', 10);
  const offset = parseInt(req.query.offset as string || '0', 10);
  const search = req.query.search as string | undefined;

  const query: any = { userId: req.userId };
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { transcript: { $regex: search, $options: 'i' } },
    ];
  }

  const [videos, total] = await Promise.all([
    VideoData.find(query).sort({ datetimeRecorded: -1 }).skip(offset).limit(limit),
    VideoData.countDocuments(query),
  ]);

  res.json({ videos, total, limit, offset });
}

export async function getVideo(req: Request, res: Response) {
  const video = await VideoData.findOne({ _id: req.params.id, userId: req.userId });
  if (!video) return res.status(404).json({ error: 'Video not found' });
  res.json(video);
}

export async function uploadVideo(req: Request, res: Response) {
  if (!req.file) return res.status(400).json({ error: 'No video file provided' });

  const filename = req.file.filename;
  const userId = req.userId!;
  let duration = 0;

  try {
    duration = await getVideoDuration(userId, filename);
  } catch {
    // non-fatal; duration stays 0
  }

  const video = await VideoData.create({
    userId,
    title: req.body.title || new Date().toLocaleString(),
    filename,
    duration,
    datetimeRecorded: new Date(),
    weekday: new Date().toString().split(' ')[0],
  });

  res.status(201).json(video);
}

export async function updateVideo(req: Request, res: Response) {
  const allowed = [
    'title', 'keywords', 'locations', 'emotionStickers', 'painScale',
    'numericScale', 'textComments', 'isSelected', 'bulletPointsLocked',
  ];
  const updates: Record<string, any> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const video = await VideoData.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    updates,
    { new: true },
  );
  if (!video) return res.status(404).json({ error: 'Video not found' });
  res.json(video);
}

export async function deleteVideo(req: Request, res: Response) {
  const video = await VideoData.findOne({ _id: req.params.id, userId: req.userId });
  if (!video) return res.status(404).json({ error: 'Video not found' });

  // Delete file from the owner's folder
  const filePath = path.join(userUploadDir(req.userId!), video.filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Remove from this user's video sets
  await VideoSet.updateMany(
    { userId: req.userId, videoIDs: video._id },
    { $pull: { videoIDs: video._id } },
  );

  // Delete this user's now-empty video sets
  await VideoSet.deleteMany({ userId: req.userId, videoIDs: { $size: 0 } });

  await video.deleteOne();
  res.json({ message: 'Video deleted' });
}

export async function streamVideoFile(req: Request, res: Response) {
  const { filename } = req.params;
  // Basic path traversal protection
  if (filename.includes('..') || filename.includes('/')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  // Ownership check: only stream a file that belongs to the logged-in user.
  const video = await VideoData.findOne({ filename, userId: req.userId });
  if (!video) return res.status(404).json({ error: 'Video not found' });

  streamVideo(req, res, req.userId!, filename as string);
}

export async function transcribeVideoById(req: Request, res: Response) {
  const video = await VideoData.findOne({ _id: req.params.id, userId: req.userId });
  if (!video) return res.status(404).json({ error: 'Video not found' });

  if (video.isTranscribed) {
    return res.json({
      message: 'Already transcribed',
      transcript: video.transcript,
      flagged_for_harm: video.flagged_for_harm,
      frequencyData: video.frequencyData,
    });
  }

  try {
    const result = await transcribeVideo(req.userId!, video.filename);

    await VideoData.findByIdAndUpdate(video._id, {
      transcript: result.transcript,
      isTranscribed: true,
      flagged_for_harm: result.crisisResult.flagged,
      frequencyData: JSON.stringify(result.frequencyData),
    });

    res.json({
      transcript: result.transcript,
      isTranscribed: true,
      flagged_for_harm: result.crisisResult.flagged,
      detectedPhrases: result.crisisResult.detectedPhrases,
      frequencyData: result.frequencyData,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Transcription failed' });
  }
}

// Server-Sent Events endpoint for real-time transcription progress
export async function transcriptionStatus(req: Request, res: Response) {
  const video = await VideoData.findOne({ _id: req.params.id, userId: req.userId });
  if (!video) return res.status(404).json({ error: 'Video not found' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (stage: TranscriptionStage, progress: number, message: string) => {
    res.write(`data: ${JSON.stringify({ stage, progress, message })}\n\n`);
  };

  try {
    const result = await transcribeVideo(req.userId!, video.filename, send);

    await VideoData.findByIdAndUpdate(video._id, {
      transcript: result.transcript,
      isTranscribed: true,
      flagged_for_harm: result.crisisResult.flagged,
      frequencyData: JSON.stringify(result.frequencyData),
    });

    res.write(`data: ${JSON.stringify({
      stage: 'complete',
      progress: 100,
      message: 'Done',
      data: {
        transcript: result.transcript,
        flagged_for_harm: result.crisisResult.flagged,
        detectedPhrases: result.crisisResult.detectedPhrases,
      },
    })}\n\n`);
  } catch (error: any) {
    res.write(`data: ${JSON.stringify({ stage: 'error', progress: 0, message: error.message })}\n\n`);
  } finally {
    res.end();
  }
}
