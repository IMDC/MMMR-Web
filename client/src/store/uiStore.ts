import { create } from 'zustand';
import { SentimentType } from '../types';

interface SentimentConflict {
  videoTitle: string;
  userSentiment: SentimentType;
  aiSentiment: SentimentType;
}

interface CrisisAlert {
  videoId: string;
  videoTitle: string;
  detectedPhrases: string[];
}

interface UIStore {
  isLoading: boolean;
  loadingMessage: string;
  crisisAlerts: CrisisAlert[];
  sentimentConflicts: SentimentConflict[];
  sidebarOpen: boolean;

  setLoading: (loading: boolean, message?: string) => void;
  addCrisisAlert: (alert: CrisisAlert) => void;
  dismissCrisisAlert: (videoId: string) => void;
  addSentimentConflict: (conflict: SentimentConflict) => void;
  dismissSentimentConflict: () => void;
  clearAllConflicts: () => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isLoading: false,
  loadingMessage: '',
  crisisAlerts: [],
  sentimentConflicts: [],
  sidebarOpen: false,

  setLoading: (loading, message = '') => set({ isLoading: loading, loadingMessage: message }),

  addCrisisAlert: (alert) =>
    set(state => ({ crisisAlerts: [...state.crisisAlerts, alert] })),

  dismissCrisisAlert: (videoId) =>
    set(state => ({ crisisAlerts: state.crisisAlerts.filter(a => a.videoId !== videoId) })),

  addSentimentConflict: (conflict) =>
    set(state => ({ sentimentConflicts: [...state.sentimentConflicts, conflict] })),

  dismissSentimentConflict: () =>
    set(state => ({ sentimentConflicts: state.sentimentConflicts.slice(1) })),

  clearAllConflicts: () => set({ sentimentConflicts: [] }),

  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
}));
