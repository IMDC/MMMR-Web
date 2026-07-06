import apiClient from './client';
import { Contact } from '../types';

export const contactsApi = {
  list: () =>
    apiClient.get<Contact[]>('/contacts').then(r => r.data),

  create: (data: { name: string; email: string; type: string; relationship?: string }) =>
    apiClient.post<Contact>('/contacts', data).then(r => r.data),

  update: (id: string, data: Partial<Contact>) =>
    apiClient.patch<Contact>(`/contacts/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete(`/contacts/${id}`).then(r => r.data),
};
