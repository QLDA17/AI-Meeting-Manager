import api from './api';
import type { ActionItem, ActionItemCreate, ActionItemUpdate } from '../types';
import { normalizeActionItem } from './mappers';

export const actionItemService = {
  list: async (params?: { meeting_id?: string; status?: string }) => {
    const response = await api.get<ActionItem[]>('/api/action-items', { params });
    return Array.isArray(response.data) ? response.data.map(normalizeActionItem) : [];
  },

  create: async (data: ActionItemCreate) => {
    const response = await api.post<ActionItem>('/api/action-items', data);
    return normalizeActionItem(response.data);
  },

  update: async (id: string, data: ActionItemUpdate) => {
    const response = await api.patch<ActionItem>(`/api/action-items/${id}`, data);
    return normalizeActionItem(response.data);
  },

  delete: async (id: string) => {
    await api.delete(`/api/action-items/${id}`);
    return id;
  },
};
