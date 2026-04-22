import { create } from 'zustand';

export interface Glossary {
  id: string;
  name: string;
  scope: 'GLOBAL' | 'ORGANIZATION';
  organizationId?: string;
  termCount: number;
  description?: string;
  lastUpdated: string;
}

interface GlossaryState {
  glossaries: Glossary[];
  selectedGlossaryIds: string[];
  isLoading: boolean;
  
  loadGlossaries: (orgId?: string) => Promise<void>;
  setSelectedGlossaryIds: (ids: string[]) => void;
  addGlossary: (glossary: Glossary) => void;
  removeGlossary: (id: string) => void;
}

export const useGlossaryStore = create<GlossaryState>((set) => ({
  glossaries: [],
  selectedGlossaryIds: [],
  isLoading: false,

  loadGlossaries: async (orgId) => {
    set({ isLoading: true });
    // Simulate API call
    setTimeout(() => {
      const mockGlossaries: Glossary[] = [
        {
          id: 'g1',
          name: 'IT Core Vocabulary',
          scope: 'GLOBAL',
          termCount: 1250,
          description: 'Common technical terms in IT and Software Development.',
          lastUpdated: '2026-01-15',
        },
        {
          id: 'g2',
          name: 'Medical Terminology',
          scope: 'GLOBAL',
          termCount: 850,
          description: 'Basic medical terms for general healthcare meetings.',
          lastUpdated: '2026-02-10',
        },
      ];

      if (orgId) {
        mockGlossaries.push({
          id: 'g3',
          name: 'MUTI_AI Project Terms',
          scope: 'ORGANIZATION',
          organizationId: orgId,
          termCount: 45,
          description: 'Internal project terms and abbreviations.',
          lastUpdated: '2026-04-20',
        });
      }

      set({ glossaries: mockGlossaries, isLoading: false });
    }, 500);
  },

  setSelectedGlossaryIds: (ids) => set({ selectedGlossaryIds: ids }),
  
  addGlossary: (glossary) => 
    set((state) => ({ glossaries: [glossary, ...state.glossaries] })),
    
  removeGlossary: (id) => 
    set((state) => ({ 
      glossaries: state.glossaries.filter(g => g.id !== id),
      selectedGlossaryIds: state.selectedGlossaryIds.filter(sid => sid !== id)
    })),
}));
