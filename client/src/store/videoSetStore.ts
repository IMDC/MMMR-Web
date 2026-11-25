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
  updateWordSettings: (id: string, patch: WordSettingsPatch) => void;
  flushWordSettings: (id: string) => Promise<void>;
}

/** The per-set Word Settings the charts own. */
export type WordSettingsPatch = Partial<
  Pick<VideoSet, 'hiddenWords' | 'barGraphMinCount' | 'wordCloudPalette'>
>;

// Word Settings are tapped in bursts — one checkbox per word — so the write is
// coalesced rather than fired per tap. The local store updates immediately so
// the chart reacts without waiting on the network; the pending patch is keyed
// by set id and lives outside the store so navigating away does not cancel it.
const PERSIST_DELAY_MS = 600;
const pendingPatch: Record<string, WordSettingsPatch> = {};
const persistTimer: Record<string, ReturnType<typeof setTimeout>> = {};

async function persistNow(id: string) {
  const body = pendingPatch[id];
  delete pendingPatch[id];
  if (persistTimer[id]) {
    clearTimeout(persistTimer[id]);
    delete persistTimer[id];
  }
  if (!body) return;
  try {
    // The response is deliberately not written back into the store: a reply
    // that lost a race with a newer tap would undo it on screen.
    await videoSetsApi.update(id, body);
  } catch (error) {
    // Keep the optimistic value rather than yanking the chart out from under
    // the user; the next fetchSets resyncs from the server.
    console.error('Could not save word settings', error);
  }
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

  updateWordSettings: (id, patch) => {
    set(state => ({
      videoSets: state.videoSets.map(s => s._id === id ? { ...s, ...patch } : s),
    }));
    pendingPatch[id] = { ...pendingPatch[id], ...patch };
    if (persistTimer[id]) clearTimeout(persistTimer[id]);
    persistTimer[id] = setTimeout(() => { void persistNow(id); }, PERSIST_DELAY_MS);
  },

  // Called when a settings modal closes, so a selection is not left sitting in
  // the debounce window if the tab goes away.
  flushWordSettings: (id) => persistNow(id),

  refreshSet: async (id) => {
    const updated = await videoSetsApi.get(id);
    set(state => {
      const exists = state.videoSets.some(s => s._id === id);
      return {
        videoSets: exists
          ? state.videoSets.map(s => s._id === id ? updated : s)
          : [...state.videoSets, updated],
      };
    });
  },
}));
