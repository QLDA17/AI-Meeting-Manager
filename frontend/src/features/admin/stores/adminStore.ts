import { create } from 'zustand';

interface AdminStats {
  totalOrgs: number;
  totalUsers: number;
  totalMeetings: number;
  totalHours: number;
  processingNow: number;
}

interface AdminState {
  stats: AdminStats;
  isLoading: boolean;
  setStats: (stats: AdminStats) => void;
  setLoading: (loading: boolean) => void;
  // Sẽ thêm các actions gọi API thực tế tại đây
}

export const useAdminStore = create<AdminState>((set) => ({
  stats: {
    totalOrgs: 0,
    totalUsers: 0,
    totalMeetings: 0,
    totalHours: 0,
    processingNow: 0,
  },
  isLoading: false,
  setStats: (stats) => set({ stats }),
  setLoading: (isLoading) => set({ isLoading }),
}));
