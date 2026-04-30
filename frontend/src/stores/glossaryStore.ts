import { create } from 'zustand';
import api from '../services/api';
import type { GlossaryTerm } from '../types';
import { normalizeGlossaryTerm } from '../services/mappers';

interface GlossaryState {
  glossaries: GlossaryTerm[];
  selectedGlossaryIds: string[];
  isLoading: boolean;
  error: string | null;
  loadGlossaries: (orgId?: string) => Promise<void>;
  setSelectedGlossaryIds: (ids: string[]) => void;
  addGlossary: (glossary: GlossaryTerm) => void;
  createGlossary: (payload: Partial<GlossaryTerm> & { term: string }) => Promise<GlossaryTerm>;
  updateGlossary: (id: string, payload: Partial<GlossaryTerm>) => Promise<GlossaryTerm>;
  removeGlossary: (id: string) => Promise<void>;
}

export const useGlossaryStore = create<GlossaryState>((set) => ({
  glossaries: [],
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
    } catch (err: any) {
      set({ isLoading: false, error: err.response?.data?.detail || 'Failed to load glossary' });
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
}));
