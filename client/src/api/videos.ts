import apiClient from './client';
import { Video } from '../types';

export const videosApi = {
  list: (params?: { limit?: number; offset?: number; search?: string }) =>
    apiClient.get<{ videos: Video[]; total: number }>('/videos', { params }).then(r => r.data),

  get: (id: string) =>
    apiClient.get<Video>(`/videos/${id}`).then(r => r.data),

  upload: (file: File, title?: string, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append('video', file);
    if (title) form.append('title', title);
    return apiClient.post<Video>('/videos/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    }).then(r => r.data);
  },

  update: (id: string, data: Partial<Video>) =>
    apiClient.patch<Video>(`/videos/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete(`/videos/${id}`).then(r => r.data),

  transcribe: (id: string) =>
    apiClient.post(`/videos/${id}/transcribe`).then(r => r.data),

  streamUrl: (filename: string) => `/api/videos/stream/${encodeURIComponent(filename)}`,
};
