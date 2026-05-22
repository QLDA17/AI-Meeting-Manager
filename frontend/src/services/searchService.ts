import api from './api';
import type { SearchResult } from '../types';

export const searchService = {
  search: async (query: string) => {
    const response = await api.get<SearchResult[]>('/api/search', {
      params: { q: query },
    });
    return Array.isArray(response.data) ? response.data : [];
  },
};
