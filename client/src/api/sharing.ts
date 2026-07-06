import apiClient from './client';
import { SharedContent, SharingPermissions, Recipient } from '../types';

export const sharingApi = {
  list: () =>
    apiClient.get<SharedContent[]>('/sharing').then(r => r.data),

  create: (data: {
    contentType: string;
    contentId: string;
    contentName: string;
    recipients?: Recipient[];
    permissions?: Partial<SharingPermissions>;
    shareMessage?: string;
    expireAfter?: number;
    isPublic?: boolean;
    tags?: string[];
  }) => apiClient.post<SharedContent>('/sharing', data).then(r => r.data),

  get: (id: string) =>
    apiClient.get<SharedContent>(`/sharing/${id}`).then(r => r.data),

  update: (id: string, data: Partial<SharedContent>) =>
    apiClient.patch<SharedContent>(`/sharing/${id}`, data).then(r => r.data),

  deactivate: (id: string) =>
    apiClient.post(`/sharing/${id}/deactivate`).then(r => r.data),

  reactivate: (id: string) =>
    apiClient.post(`/sharing/${id}/reactivate`).then(r => r.data),

  getByCode: (code: string) =>
    apiClient.get<SharedContent>(`/sharing/access/${code}`).then(r => r.data),
};
