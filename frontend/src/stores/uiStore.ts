/**
 * UI Store - UI state management
 * Zustand store for theme, sidebar, and modal states only.
 *
 * NOTE: Org/Group selection is managed by orgStore and groupStore.
 * Do NOT add selectedOrgId/selectedGroupId here to avoid duplication.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Theme & Layout
  isDarkMode: boolean;
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;

  // Modal/Dialog States
  isCreateMeetingOpen: boolean;
  isCreateGroupOpen: boolean;
  isSettingsOpen: boolean;

  // Actions
  setDarkMode: (value: boolean) => void;
  toggleDarkMode: () => void;
  setSidebarOpen: (value: boolean) => void;
  toggleSidebar: () => void;
  setMobileSidebarOpen: (value: boolean) => void;
  toggleMobileSidebar: () => void;

  // Modal Actions
  setCreateMeetingOpen: (value: boolean) => void;
  setCreateGroupOpen: (value: boolean) => void;
  setSettingsOpen: (value: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Theme & Layout
      isDarkMode: false,
      sidebarOpen: true,
      mobileSidebarOpen: false,

      // Modal/Dialog States
      isCreateMeetingOpen: false,
      isCreateGroupOpen: false,
      isSettingsOpen: false,

      // Theme Actions
      setDarkMode: (value) => set({ isDarkMode: value }),

      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),

      // Sidebar Actions
      setSidebarOpen: (value) => set({ sidebarOpen: value }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setMobileSidebarOpen: (value) => set({ mobileSidebarOpen: value }),
      toggleMobileSidebar: () =>
        set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),

      // Modal Actions
      setCreateMeetingOpen: (value) => set({ isCreateMeetingOpen: value }),
      setCreateGroupOpen: (value) => set({ isCreateGroupOpen: value }),
      setSettingsOpen: (value) => set({ isSettingsOpen: value }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
