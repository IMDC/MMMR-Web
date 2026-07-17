import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SharedContent } from '../models/SharedContent';

export async function listSharing(req: Request, res: Response) {
  const records = await SharedContent.find({ userId: req.userId }).sort({ dateCreated: -1 });
  res.json(records);
}

export async function createSharing(req: Request, res: Response) {
  const { contentType, contentId, contentName, recipients, permissions, shareMessage, expireAfter, isPublic, tags } = req.body;

  if (!contentType || !contentId || !contentName) {
    return res.status(400).json({ error: 'contentType, contentId, and contentName are required' });
  }

  const permissionId = uuidv4();
  const publicAccessCode = isPublic ? uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase() : undefined;
  const dateExpires = new Date(Date.now() + (expireAfter || 30) * 24 * 60 * 60 * 1000);

  const record = await SharedContent.create({
    userId: req.userId,
    permissionId,
    contentType,
    contentId,
    contentName,
    recipients: recipients || [],
    permissions: permissions || {},
    shareMessage: shareMessage || '',
    expireAfter: expireAfter || 30,
    isPublic: !!isPublic,
    publicAccessCode,
    dateExpires,
    tags: tags || [],
    activities: [{
      action: 'shared',
      timestamp: new Date(),
      recipientId: '',
      recipientName: 'All Recipients',
      details: `Shared ${contentType}: ${contentName}`,
    }],
  });

  res.status(201).json(record);
}

export async function getSharing(req: Request, res: Response) {
  const record = await SharedContent.findOne({ _id: req.params.id, userId: req.userId });
  if (!record) return res.status(404).json({ error: 'Sharing record not found' });
  res.json(record);
}

export async function updateSharing(req: Request, res: Response) {
  const allowed = ['permissions', 'shareMessage', 'expireAfter', 'isPublic', 'tags', 'recipients'];
  const updates: Record<string, any> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (req.body.expireAfter) {
    updates.dateExpires = new Date(Date.now() + req.body.expireAfter * 24 * 60 * 60 * 1000);
  }

  const record = await SharedContent.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    updates,
    { new: true },
  );
  if (!record) return res.status(404).json({ error: 'Sharing record not found' });
  res.json(record);
}

export async function deactivateSharing(req: Request, res: Response) {
  const record = await SharedContent.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { isActive: false, isDeactivating: false },
    { new: true },
  );
  if (!record) return res.status(404).json({ error: 'Sharing record not found' });
  res.json(record);
}

export async function reactivateSharing(req: Request, res: Response) {
  const record = await SharedContent.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { isActive: true },
    { new: true },
  );
  if (!record) return res.status(404).json({ error: 'Sharing record not found' });
  res.json(record);
}

export async function getSharingByCode(req: Request, res: Response) {
  const record = await SharedContent.findOne({
    publicAccessCode: req.params.code,
    isActive: true,
    isPublic: true,
  });
  if (!record) return res.status(404).json({ error: 'Sharing record not found or inactive' });

  // Increment access count
  await SharedContent.findByIdAndUpdate(record._id, {
    $inc: { accessCount: 1 },
    lastAccessed: new Date(),
  });

  res.json(record);
}
