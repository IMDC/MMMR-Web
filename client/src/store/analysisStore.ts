import { create } from 'zustand';
import { FrequencyPoint, BulletSentiment } from '../types';
import { analysisApi } from '../api/analysis';
import { useUIStore } from './uiStore';

// Raised here rather than in the calling page, so every analysis path shows the
// alert — the Reports set-level run as well as any single-video call. The
// sentiments are read off the response because they are computed during analysis
// and never stored on the video.
function raiseConflicts(
  conflicts: Array<{ videoId?: string; videoTitle?: string; userSentiment: any; aiSentiment: any }>,
) {
  for (const c of conflicts) {
    useUIStore.getState().addSentimentConflict({
      videoId: c.videoId,
      videoTitle: c.videoTitle || 'this recording',
      userSentiment: c.userSentiment,
      aiSentiment: c.aiSentiment,
    });
  }
}

interface FrequencyData {
  barData: { data: FrequencyPoint[] };
  wordCloudData: FrequencyPoint[];
  wordList: FrequencyPoint[];
  freqMaps: any[];
}

interface AnalysisStore {
  frequencyCache: Record<string, FrequencyData>;
  selectedWord: string;
  isAnalyzing: boolean;
  lastAnalyzedSetId: string | null;

  fetchFrequencyData: (videoSetId: string, minCount?: number) => Promise<FrequencyData>;
  fetchLineGraphData: (videoSetId: string, word: string) => Promise<any>;
  analyzeVideo: (videoId: string, skipTextReports?: boolean) => Promise<any>;
  analyzeVideoSet: (videoSetId: string, forceAll?: boolean) => Promise<any>;
  setSelectedWord: (word: string) => void;
  clearCache: (videoSetId?: string) => void;
}

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  frequencyCache: {},
  selectedWord: '',
  isAnalyzing: false,
  lastAnalyzedSetId: null,

  fetchFrequencyData: async (videoSetId, minCount = 2) => {
    const cacheKey = `${videoSetId}:${minCount}`;
    const cached = get().frequencyCache[cacheKey];
    if (cached) return cached;

    const data = await analysisApi.getFrequencyData(videoSetId, minCount);
    set(state => ({
      frequencyCache: { ...state.frequencyCache, [cacheKey]: data },
    }));
    return data;
  },

  fetchLineGraphData: async (videoSetId, word) => {
    return analysisApi.getLineGraphData(videoSetId, word);
  },

  analyzeVideo: async (videoId, skipTextReports = false) => {
    set({ isAnalyzing: true });
    try {
      const result = await analysisApi.analyzeVideo(videoId, skipTextReports);
      if (result?.conflictDetected) raiseConflicts([{ ...result, videoId }]);
      return result;
    } finally {
      set({ isAnalyzing: false });
    }
  },

  analyzeVideoSet: async (videoSetId, forceAll = false) => {
    set({ isAnalyzing: true, lastAnalyzedSetId: videoSetId });
    try {
      const result = await analysisApi.analyzeVideoSet(videoSetId, forceAll);
      if (result?.conflicts?.length) raiseConflicts(result.conflicts);
      // Invalidate frequency cache for this set
      get().clearCache(videoSetId);
      return result;
    } finally {
      set({ isAnalyzing: false });
    }
  },

  setSelectedWord: (word) => set({ selectedWord: word }),

  clearCache: (videoSetId) => {
    if (videoSetId) {
      set(state => {
        const rest: Record<string, FrequencyData> = {};
        for (const key of Object.keys(state.frequencyCache)) {
          if (!key.startsWith(`${videoSetId}:`)) rest[key] = state.frequencyCache[key];
        }
        return { frequencyCache: rest };
      });
    } else {
      set({ frequencyCache: {} });
    }
  },
}));
