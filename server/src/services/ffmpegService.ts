import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { userUploadDir } from '../utils/userPaths';

// In Docker, use the system FFmpeg installed via apk.
// Locally, fall back to the @ffmpeg-installer/ffmpeg npm package.
if (process.env.NODE_ENV === 'production') {
  ffmpeg.setFfmpegPath('/usr/bin/ffmpeg');
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ffmpegPath = require('@ffmpeg-installer/ffmpeg');
  ffmpeg.setFfmpegPath(ffmpegPath.path);
}

// All file operations are scoped to the owning participant's upload folder.
export async function extractAudio(userId: string, videoFilename: string): Promise<string> {
  const dir = userUploadDir(userId);
  const videoPath = path.join(dir, videoFilename);
  const mp3Filename = videoFilename.replace(/\.[^/.]+$/, '.mp3');
  const mp3Path = path.join(dir, mp3Filename);

  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioFrequency(22050)
      .audioBitrate('128k')
      .output(mp3Path)
      .on('end', () => resolve(mp3Filename))
      .on('error', (err: Error) => reject(new Error(`FFmpeg audio extraction failed: ${err.message}`)))
      .run();
  });
}

export async function cleanupAudio(userId: string, mp3Filename: string): Promise<void> {
  const mp3Path = path.join(userUploadDir(userId), mp3Filename);
  if (fs.existsSync(mp3Path)) {
    fs.unlinkSync(mp3Path);
  }
}

export function getVideoDuration(userId: string, videoFilename: string): Promise<number> {
  const videoPath = path.join(userUploadDir(userId), videoFilename);

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      const dur = Number(metadata.format.duration);
      resolve(isFinite(dur) ? dur : 0);
    });
  });
}
