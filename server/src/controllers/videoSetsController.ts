import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { VideoSet } from '../models/VideoSet';
import { VideoData } from '../models/VideoData';

export async function listVideoSets(_req: Request, res: Response) {
  const sets = await VideoSet.find().sort({ datetime: -1 });
  res.json(sets);
}

export async function createVideoSet(req: Request, res: Response) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const set = await VideoSet.create({
    name,
    datetime: new Date(),
  });
  res.status(201).json(set);
}

export async function getVideoSet(req: Request, res: Response) {
  const set = await VideoSet.findById(req.params.id);
  if (!set) return res.status(404).json({ error: 'Video set not found' });
  res.json(set);
}

export async function updateVideoSet(req: Request, res: Response) {
  const allowed = [
    'name', 'isCurrent', 'reportFormat', 'selectedWords', 'aiOptedIn',
    'summaryAnalysisBullet', 'summaryAnalysisSentence', 'isSummaryGenerated',
    'combinedFrequencyData', 'isFrequencyAnalyzed',
  ];
  const updates: Record<string, any> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const set = await VideoSet.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!set) return res.status(404).json({ error: 'Video set not found' });
  res.json(set);
}

export async function deleteVideoSet(req: Request, res: Response) {
  const set = await VideoSet.findByIdAndDelete(req.params.id);
  if (!set) return res.status(404).json({ error: 'Video set not found' });
  res.json({ message: 'Video set deleted' });
}

export async function addVideosToSet(req: Request, res: Response) {
  const { videoIds } = req.body;
  if (!Array.isArray(videoIds) || videoIds.length === 0) {
    return res.status(400).json({ error: 'videoIds array is required' });
  }

  const objectIds = videoIds.map((id: string) => new Types.ObjectId(id));

  const set = await VideoSet.findByIdAndUpdate(
    req.params.id,
    { $addToSet: { videoIDs: { $each: objectIds } } },
    { new: true },
  );
  if (!set) return res.status(404).json({ error: 'Video set not found' });

  // Update date range
  const videos = await VideoData.find({ _id: { $in: set.videoIDs } }).sort({ datetimeRecorded: 1 });
  if (videos.length > 0) {
    set.earliestVideoDateTime = videos[0].datetimeRecorded;
    set.latestVideoDateTime = videos[videos.length - 1].datetimeRecorded;
    await set.save();
  }

  res.json(set);
}

export async function removeVideoFromSet(req: Request, res: Response) {
  const videoId = new Types.ObjectId(req.params.videoId as string);

  const set = await VideoSet.findByIdAndUpdate(
    req.params.id,
    { $pull: { videoIDs: videoId } },
    { new: true },
  );
  if (!set) return res.status(404).json({ error: 'Video set not found' });

  // If set is now empty, delete it
  if (set.videoIDs.length === 0) {
    await set.deleteOne();
    return res.json({ message: 'Video removed; set was empty and has been deleted' });
  }

  res.json(set);
}
