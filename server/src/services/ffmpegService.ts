import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import path from 'path';
import fs from 'fs';
import { config } from '../config/env';

ffmpeg.setFfmpegPath(ffmpegPath.path);

export async function extractAudio(videoFilename: string): Promise<string> {
  const videoPath = path.join(config.uploadsDir, videoFilename);
  const mp3Filename = videoFilename.replace(/\.[^/.]+$/, '.mp3');
  const mp3Path = path.join(config.uploadsDir, mp3Filename);

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

export async function cleanupAudio(mp3Filename: string): Promise<void> {
  const mp3Path = path.join(config.uploadsDir, mp3Filename);
  if (fs.existsSync(mp3Path)) {
    fs.unlinkSync(mp3Path);
  }
}

export function getVideoDuration(videoFilename: string): Promise<number> {
  const videoPath = path.join(config.uploadsDir, videoFilename);

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      const dur = Number(metadata.format.duration);
      resolve(isFinite(dur) ? dur : 0);
    });
  });
}
