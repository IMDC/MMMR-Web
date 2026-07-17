import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { userUploadDir } from './userPaths';

export function streamVideo(req: Request, res: Response, userId: string, filename: string) {
  const filePath = path.join(userUploadDir(userId), filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: 'Video file not found' });
    return;
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const rangeHeader = req.headers.range;

  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.webm': 'video/webm',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
  };
  const contentType = mimeTypes[ext] || 'video/mp4';

  if (rangeHeader) {
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': contentType,
    });

    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(filePath).pipe(res);
  }
}
