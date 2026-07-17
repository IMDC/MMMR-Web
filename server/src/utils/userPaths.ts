import fs from 'fs';
import path from 'path';
import { config } from '../config/env';

// Each participant gets their own "shelf" folder under the uploads dir:
//   <uploadsDir>/<userId>/<uuid>.webm
export function userUploadDir(userId: string): string {
  return path.join(config.uploadsDir, String(userId));
}

// Resolve (and create if missing) a user's upload folder.
export function ensureUserUploadDir(userId: string): string {
  const dir = userUploadDir(userId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
