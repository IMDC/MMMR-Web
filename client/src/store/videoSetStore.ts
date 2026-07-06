import { create } from 'zustand';
import { VideoSet } from '../types';
import { videoSetsApi } from '../api/videoSets';

interface VideoSetStore {
  videoSets: VideoSet[];
  currentSetId: string | null;
  isLoading: boolean;

  fetchSets: () => Promise<void>;
  createSet: (name: string) => Promise<VideoSet>;
  updateSet: (id: string, data: Partial<VideoSet>) => Promise<VideoSet>;
  deleteSet: (id: string) => Promise<void>;
  addVideosToSet: (setId: string, videoIds: string[]) => Promise<VideoSet>;
  removeVideoFromSet: (setId: string, videoId: string) => Promise<void>;
  setCurrentSetId: (id: string | null) => void;
  refreshSet: (id: string) => Promise<void>;
}

export const useVideoSetStore = create<VideoSetStore>((set, get) => ({
  videoSets: [],
  currentSetId: null,
  isLoading: false,

  fetchSets: async () => {
    set({ isLoading: true });
    try {
      const sets = await videoSetsApi.list();
      set({ videoSets: sets, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  createSet: async (name) => {
    const newSet = await videoSetsApi.create(name);
    set(state => ({ videoSets: [newSet, ...state.videoSets] }));
    return newSet;
  },

  updateSet: async (id, data) => {
    const updated = await videoSetsApi.update(id, data);
    set(state => ({
      videoSets: state.videoSets.map(s => s._id === id ? updated : s),
    }));
    return updated;
  },

  deleteSet: async (id) => {
    await videoSetsApi.delete(id);
    set(state => ({
      videoSets: state.videoSets.filter(s => s._id !== id),
      currentSetId: state.currentSetId === id ? null : state.currentSetId,
    }));
  },

  addVideosToSet: async (setId, videoIds) => {
    const updated = await videoSetsApi.addVideos(setId, videoIds);
    set(state => ({
      videoSets: state.videoSets.map(s => s._id === setId ? updated : s),
    }));
    return updated;
  },

  removeVideoFromSet: async (setId, videoId) => {
    await videoSetsApi.removeVideo(setId, videoId);
    await get().fetchSets();
  },

  setCurrentSetId: (id) => set({ currentSetId: id }),

  refreshSet: async (id) => {
    const updated = await videoSetsApi.get(id);
    set(state => ({
      videoSets: state.videoSets.map(s => s._id === id ? updated : s),
    }));
  },
}));
