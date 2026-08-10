import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { VideoSet } from '../models/VideoSet';
import { VideoData } from '../models/VideoData';

export async function listVideoSets(req: Request, res: Response) {
  const sets = await VideoSet.find({ userId: req.userId }).sort({ datetime: -1 });
  res.json(sets);
}

export async function createVideoSet(req: Request, res: Response) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const set = await VideoSet.create({
    userId: req.userId,
    name,
    datetime: new Date(),
  });
  res.status(201).json(set);
}

export async function getVideoSet(req: Request, res: Response) {
  const set = await VideoSet.findOne({ _id: req.params.id, userId: req.userId });
  if (!set) return res.status(404).json({ error: 'Video set not found' });
  res.json(set);
}

export async function updateVideoSet(req: Request, res: Response) {
  const allowed = [
    'name', 'reportFormat', 'aiOptedIn',
    'summaryAnalysisBullet', 'summaryAnalysisSentence', 'isSummaryGenerated',
  ];
  const updates: Record<string, any> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const set = await VideoSet.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    updates,
    { new: true },
  );
  if (!set) return res.status(404).json({ error: 'Video set not found' });
  res.json(set);
}

export async function deleteVideoSet(req: Request, res: Response) {
  const set = await VideoSet.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  if (!set) return res.status(404).json({ error: 'Video set not found' });
  res.json({ message: 'Video set deleted' });
}

export async function addVideosToSet(req: Request, res: Response) {
  const { videoIds } = req.body;
  if (!Array.isArray(videoIds) || videoIds.length === 0) {
    return res.status(400).json({ error: 'videoIds array is required' });
  }

  const objectIds = videoIds.map((id: string) => new Types.ObjectId(id));

  // Only allow adding videos the user actually owns.
  const ownedCount = await VideoData.countDocuments({ _id: { $in: objectIds }, userId: req.userId });
  if (ownedCount !== objectIds.length) {
    return res.status(403).json({ error: 'One or more videos do not belong to you' });
  }

  const set = await VideoSet.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { $addToSet: { videoIDs: { $each: objectIds } } },
    { new: true },
  );
  if (!set) return res.status(404).json({ error: 'Video set not found' });

  res.json(set);
}

export async function removeVideoFromSet(req: Request, res: Response) {
  const videoId = new Types.ObjectId(req.params.videoId as string);

  const set = await VideoSet.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { $pull: { videoIDs: videoId } },
    { new: true },
  );
  if (!set) return res.status(404).json({ error: 'Video set not found' });

  res.json(set);
}
