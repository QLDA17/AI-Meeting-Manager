/**
 * UI Store - UI state management
 * Zustand store for theme, sidebar, and navigation states
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Theme & Layout
  isDarkMode: boolean;
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;

  // Organization & Group Selection
  selectedOrgId: string | null;
  selectedGroupId: string | null;

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

  // Organization/Group Selection
  setSelectedOrg: (orgId: string | null) => void;
  setSelectedGroup: (groupId: string | null) => void;

  // Modal Actions
  setCreateMeetingOpen: (value: boolean) => void;
  setCreateGroupOpen: (value: boolean) => void;
  setSettingsOpen: (value: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Theme & Layout
      isDarkMode: localStorage.getItem('theme') === 'dark',
      sidebarOpen: true,
      mobileSidebarOpen: false,

      // Organization & Group Selection
      selectedOrgId: null,
      selectedGroupId: null,

      // Modal/Dialog States
      isCreateMeetingOpen: false,
      isCreateGroupOpen: false,
      isSettingsOpen: false,

      // Theme Actions
      setDarkMode: (value) => {
        set({ isDarkMode: value });
        localStorage.setItem('theme', value ? 'dark' : 'light');
        document.documentElement.classList.toggle('dark', value);
      },

      toggleDarkMode: () => {
        set((state) => {
          const newValue = !state.isDarkMode;
          localStorage.setItem('theme', newValue ? 'dark' : 'light');
          document.documentElement.classList.toggle('dark', newValue);
          return { isDarkMode: newValue };
        });
      },

      // Sidebar Actions
      setSidebarOpen: (value) => set({ sidebarOpen: value }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setMobileSidebarOpen: (value) => set({ mobileSidebarOpen: value }),
      toggleMobileSidebar: () =>
        set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),

      // Organization/Group Selection
      setSelectedOrg: (orgId) => set({ selectedOrgId: orgId, selectedGroupId: null }),
      setSelectedGroup: (groupId) => set({ selectedGroupId: groupId }),

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
        selectedOrgId: state.selectedOrgId,
        selectedGroupId: state.selectedGroupId,
      }),
    }
  )
);
