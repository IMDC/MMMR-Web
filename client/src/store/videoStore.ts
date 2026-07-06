import { create } from 'zustand';
import { Video, TranscriptionProgress } from '../types';
import { videosApi } from '../api/videos';

interface VideoStore {
  videos: Video[];
  total: number;
  isLoading: boolean;
  transcriptionJobs: Map<string, TranscriptionProgress>;

  fetchVideos: (params?: { search?: string }) => Promise<void>;
  uploadVideo: (file: File, title?: string, onProgress?: (pct: number) => void) => Promise<Video>;
  updateVideo: (id: string, data: Partial<Video>) => Promise<Video>;
  deleteVideo: (id: string) => Promise<void>;
  setTranscriptionProgress: (videoId: string, progress: TranscriptionProgress | null) => void;
  refreshVideo: (id: string) => Promise<void>;
}

export const useVideoStore = create<VideoStore>((set, get) => ({
  videos: [],
  total: 0,
  isLoading: false,
  transcriptionJobs: new Map(),

  fetchVideos: async (params) => {
    set({ isLoading: true });
    try {
      const result = await videosApi.list(params);
      set({ videos: result.videos, total: result.total, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  uploadVideo: async (file, title, onProgress) => {
    const video = await videosApi.upload(file, title, onProgress);
    set(state => ({ videos: [video, ...state.videos], total: state.total + 1 }));
    return video;
  },

  updateVideo: async (id, data) => {
    const updated = await videosApi.update(id, data);
    set(state => ({
      videos: state.videos.map(v => v._id === id ? updated : v),
    }));
    return updated;
  },

  deleteVideo: async (id) => {
    await videosApi.delete(id);
    set(state => ({
      videos: state.videos.filter(v => v._id !== id),
      total: state.total - 1,
    }));
  },

  setTranscriptionProgress: (videoId, progress) => {
    set(state => {
      const jobs = new Map(state.transcriptionJobs);
      if (progress === null) {
        jobs.delete(videoId);
      } else {
        jobs.set(videoId, progress);
      }
      return { transcriptionJobs: jobs };
    });
  },

  refreshVideo: async (id) => {
    const updated = await videosApi.get(id);
    set(state => ({
      videos: state.videos.map(v => v._id === id ? updated : v),
    }));
  },
}));
