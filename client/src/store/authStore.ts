import { create } from 'zustand';
import { authApi, AuthUser } from '../api/auth';
import { useVideoStore } from './videoStore';
import { useVideoSetStore } from './videoSetStore';
import { useAnalysisStore } from './analysisStore';

type AuthStatus = 'loading' | 'authed' | 'anon';

interface AuthStore {
  user: AuthUser | null;
  status: AuthStatus;

  checkSession: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Clear all participant data caches so nothing leaks between logins.
function resetDataStores() {
  useVideoStore.setState({ videos: [], total: 0, isLoading: false, transcriptionJobs: new Map() });
  useVideoSetStore.setState({ videoSets: [], currentSetId: null, isLoading: false });
  useAnalysisStore.setState({ frequencyCache: {}, selectedWord: '', isAnalyzing: false, lastAnalyzedSetId: null });
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  status: 'loading',

  checkSession: async () => {
    try {
      const user = await authApi.me();
      set({ user, status: 'authed' });
    } catch {
      set({ user: null, status: 'anon' });
    }
  },

  login: async (username, password) => {
    const user = await authApi.login(username, password);
    resetDataStores();
    set({ user, status: 'authed' });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      resetDataStores();
      set({ user: null, status: 'anon' });
    }
  },
}));
