import apiClient from './client';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  mustChangePassword: boolean;
  aiConsent: 'agreed' | 'disagreed' | null;
  autoTranscribe: boolean | null;
  summaryFormat: 'sentence' | 'chips' | 'both';
  recordingInfoDismissed: boolean;
}

export interface UserPreferences {
  displayName?: string;
  aiConsent?: 'agreed' | 'disagreed' | null;
  autoTranscribe?: boolean | null;
  summaryFormat?: 'sentence' | 'chips' | 'both';
  recordingInfoDismissed?: boolean;
}

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post<AuthUser>('/auth/login', { username, password }).then(r => r.data),

  logout: () =>
    apiClient.post('/auth/logout').then(r => r.data),

  me: () =>
    apiClient.get<AuthUser>('/auth/me').then(r => r.data),

  updatePreferences: (prefs: UserPreferences) =>
    apiClient.patch<AuthUser>('/auth/preferences', prefs).then(r => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post<AuthUser>('/auth/change-password', { currentPassword, newPassword }).then(r => r.data),
};
