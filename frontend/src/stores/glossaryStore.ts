import { create } from 'zustand';
import api from '../services/api';
import type { GlossaryImportReport, GlossaryInsights, GlossarySuggestion, GlossaryTerm } from '../types';
import { normalizeGlossaryInsights, normalizeGlossarySuggestion, normalizeGlossaryTerm } from '../services/mappers';

interface GlossaryState {
  glossaries: GlossaryTerm[];
  categories: string[];
  suggestions: GlossarySuggestion[];
  insights: GlossaryInsights | null;
  selectedGlossaryIds: string[];
  isLoading: boolean;
  error: string | null;
  loadGlossaries: (orgId?: string) => Promise<void>;
  loadGlossaryCategories: (orgId?: string) => Promise<void>;
  loadSuggestions: (orgId: string, status?: string) => Promise<void>;
  loadInsights: (orgId: string) => Promise<void>;
  setSelectedGlossaryIds: (ids: string[]) => void;
  addGlossary: (glossary: GlossaryTerm) => void;
  createGlossary: (payload: Record<string, unknown> & { term: string }) => Promise<GlossaryTerm>;
  updateGlossary: (id: string, payload: Record<string, unknown>) => Promise<GlossaryTerm>;
  removeGlossary: (id: string) => Promise<void>;
  importGlossaries: (orgId: string, file: File) => Promise<GlossaryImportReport>;
  exportGlossaries: (orgId: string) => Promise<Blob>;
  runSuggestions: (orgId: string) => Promise<{ processed_transcripts: number; suggestions_changed: number }>;
  approveSuggestion: (suggestionId: string, payload: Record<string, unknown> & { organization_id: string; term: string }) => Promise<GlossaryTerm>;
  mergeSuggestion: (suggestionId: string, payload: { organization_id: string; target_term_id: string; aliases: string[] }) => Promise<GlossaryTerm>;
  rejectSuggestion: (suggestionId: string, orgId: string) => Promise<void>;
}

export const useGlossaryStore = create<GlossaryState>((set) => ({
  glossaries: [],
  categories: [],
  suggestions: [],
  insights: null,
  selectedGlossaryIds: [],
  isLoading: false,
  error: null,

  loadGlossaries: async (orgId) => {
    set({ isLoading: true, error: null });
    try {
      const params = orgId ? { organization_id: orgId } : undefined;
      const response = await api.get('/api/glossary', { params });
      set({
        glossaries: Array.isArray(response.data) ? response.data.map(normalizeGlossaryTerm) : [],
        isLoading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load glossary';
      set({ isLoading: false, error: message });
    }
  },

  loadGlossaryCategories: async (orgId) => {
    try {
      const params = orgId ? { organization_id: orgId } : undefined;
      const response = await api.get('/api/glossary/categories', { params });
      set({ categories: Array.isArray(response.data) ? response.data : [] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load glossary categories';
      set({ error: message });
    }
  },

  loadSuggestions: async (orgId, status) => {
    try {
      const response = await api.get('/api/glossary/suggestions', {
        params: { organization_id: orgId, status },
      });
      set({
        suggestions: Array.isArray(response.data) ? response.data.map(normalizeGlossarySuggestion) : [],
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load glossary suggestions';
      set({ error: message });
    }
  },

  loadInsights: async (orgId) => {
    try {
      const response = await api.get('/api/glossary/insights', {
        params: { organization_id: orgId },
      });
      set({ insights: normalizeGlossaryInsights(response.data) });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load glossary insights';
      set({ error: message });
    }
  },

  setSelectedGlossaryIds: (ids) => set({ selectedGlossaryIds: ids }),

  addGlossary: (glossary) =>
    set((state) => ({ glossaries: [glossary, ...state.glossaries] })),

  createGlossary: async (payload) => {
    const response = await api.post('/api/glossary', payload);
    const created = normalizeGlossaryTerm(response.data);
    set((state) => ({ glossaries: [created, ...state.glossaries] }));
    return created;
  },

  updateGlossary: async (id, payload) => {
    const response = await api.patch(`/api/glossary/${id}`, payload);
    const updated = normalizeGlossaryTerm(response.data);
    set((state) => ({
      glossaries: state.glossaries.map((item) => (item.id === id ? updated : item)),
    }));
    return updated;
  },

  removeGlossary: async (id) => {
    await api.delete(`/api/glossary/${id}`);
    set((state) => ({
      glossaries: state.glossaries.filter((glossary) => glossary.id !== id),
      selectedGlossaryIds: state.selectedGlossaryIds.filter((selectedId) => selectedId !== id),
    }));
  },

  importGlossaries: async (orgId, file) => {
    const formData = new FormData();
    formData.append('organization_id', orgId);
    formData.append('file', file);
    const response = await api.post('/api/glossary/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  exportGlossaries: async (orgId) => {
    const response = await api.get('/api/glossary/export', {
      params: { organization_id: orgId },
      responseType: 'blob',
    });
    return response.data;
  },

  runSuggestions: async (orgId) => {
    const response = await api.post('/api/glossary/suggestions/run', { organization_id: orgId });
    return response.data;
  },

  approveSuggestion: async (suggestionId, payload) => {
    const response = await api.post(`/api/glossary/suggestions/${suggestionId}/approve`, payload);
    const created = normalizeGlossaryTerm(response.data);
    set((state) => ({
      glossaries: [created, ...state.glossaries],
      suggestions: state.suggestions.map((item) =>
        item.id === suggestionId ? { ...item, status: 'APPLIED' } : item
      ),
    }));
    return created;
  },

  mergeSuggestion: async (suggestionId, payload) => {
    const response = await api.post(`/api/glossary/suggestions/${suggestionId}/merge`, payload);
    const updated = normalizeGlossaryTerm(response.data);
    set((state) => ({
      glossaries: state.glossaries.map((item) => (item.id === updated.id ? updated : item)),
      suggestions: state.suggestions.map((item) =>
        item.id === suggestionId ? { ...item, status: 'APPLIED' } : item
      ),
    }));
    return updated;
  },

  rejectSuggestion: async (suggestionId, orgId) => {
    await api.post(`/api/glossary/suggestions/${suggestionId}/reject`, { organization_id: orgId });
    set((state) => ({
      suggestions: state.suggestions.map((item) =>
        item.id === suggestionId ? { ...item, status: 'REJECTED' } : item
      ),
    }));
  },
}));
