import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import axios from 'axios';
import { config } from '../config/env';
import { userUploadDir } from '../utils/userPaths';
import { extractAudio, cleanupAudio } from './ffmpegService';
import { detectCrisisContent, CrisisDetectionResult } from './crisisService';
import { processTranscriptToFrequency, FrequencyMap } from './frequencyService';

export type TranscriptionStage =
  | 'audio_extraction_start'
  | 'audio_extraction_done'
  | 'whisper_start'
  | 'whisper_done'
  | 'crisis_check'
  | 'frequency_analysis'
  | 'complete'
  | 'error';

export type ProgressCallback = (stage: TranscriptionStage, progress: number, message: string) => void;

export interface TranscriptionResult {
  transcript: string;
  crisisResult: CrisisDetectionResult;
  frequencyData: FrequencyMap;
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB Whisper limit

export async function transcribeVideo(
  userId: string,
  videoFilename: string,
  onProgress?: ProgressCallback,
): Promise<TranscriptionResult> {
  const emit = (stage: TranscriptionStage, progress: number, message: string) => {
    onProgress?.(stage, progress, message);
  };

  let mp3Filename: string | null = null;

  try {
    // Step 1: Extract audio
    emit('audio_extraction_start', 5, 'Extracting audio from video...');
    mp3Filename = await extractAudio(userId, videoFilename);
    emit('audio_extraction_done', 30, 'Audio extracted successfully');

    const mp3Path = path.join(userUploadDir(userId), mp3Filename);
    const fileSize = fs.statSync(mp3Path).size;

    if (fileSize > MAX_FILE_SIZE_BYTES) {
      throw new Error(`Audio file too large for Whisper API (${(fileSize / 1024 / 1024).toFixed(1)} MB > 25 MB)`);
    }

    // Step 2: Send to Whisper
    emit('whisper_start', 35, 'Sending audio to Whisper for transcription...');

    if (!config.openAiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const formData = new FormData();
    formData.append('file', fs.createReadStream(mp3Path), {
      filename: mp3Filename,
      contentType: 'audio/mpeg',
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');

    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${config.openAiKey}`,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      },
    );

    const transcript: string = response.data?.text || '';
    emit('whisper_done', 60, 'Transcription complete');

    // Step 3: Crisis detection
    emit('crisis_check', 70, 'Checking for crisis content...');
    const crisisResult = detectCrisisContent(transcript);

    // Step 4: Frequency analysis
    emit('frequency_analysis', 80, 'Analyzing word frequencies...');
    const frequencyData = processTranscriptToFrequency(transcript, 1);

    emit('complete', 100, 'Processing complete');

    return { transcript, crisisResult, frequencyData };
  } finally {
    // Always clean up audio file
    if (mp3Filename) {
      await cleanupAudio(userId, mp3Filename).catch(() => {});
    }
  }
}
