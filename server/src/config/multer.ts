import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from './env';
import { ensureUserUploadDir } from '../utils/userPaths';

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    // requireAuth runs before the upload handler, so req.userId is set.
    if (!req.userId) return cb(new Error('Not authenticated'), '');
    cb(null, ensureUserUploadDir(req.userId));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = /webm|mp4|mov|avi|mkv/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (allowed.test(ext) || file.mimetype.startsWith('video/')) {
    cb(null, true);
  } else {
    cb(new Error('Only video files are allowed'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.maxFileSizeMb * 1024 * 1024 },
});
