import apiClient from './client';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
}

export const authApi = {
  login: (username: string, password: string) =>
    apiClient.post<AuthUser>('/auth/login', { username, password }).then(r => r.data),

  logout: () =>
    apiClient.post('/auth/logout').then(r => r.data),

  me: () =>
    apiClient.get<AuthUser>('/auth/me').then(r => r.data),
};
