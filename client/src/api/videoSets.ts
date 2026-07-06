import apiClient from './client';
import { VideoSet } from '../types';

export const videoSetsApi = {
  list: () =>
    apiClient.get<VideoSet[]>('/videosets').then(r => r.data),

  create: (name: string) =>
    apiClient.post<VideoSet>('/videosets', { name }).then(r => r.data),

  get: (id: string) =>
    apiClient.get<VideoSet>(`/videosets/${id}`).then(r => r.data),

  update: (id: string, data: Partial<VideoSet>) =>
    apiClient.patch<VideoSet>(`/videosets/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete(`/videosets/${id}`).then(r => r.data),

  addVideos: (id: string, videoIds: string[]) =>
    apiClient.post<VideoSet>(`/videosets/${id}/videos`, { videoIds }).then(r => r.data),

  removeVideo: (id: string, videoId: string) =>
    apiClient.delete(`/videosets/${id}/videos/${videoId}`).then(r => r.data),
};
