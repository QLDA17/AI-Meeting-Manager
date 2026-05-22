import { create } from 'zustand';
import api from '../../../services/api';

interface AdminStats {
  totalOrgs: number;
  totalUsers: number;
  totalMeetings: number;
  totalHours: number;
  processingNow: number;
  totalGroups: number;
}

interface AdminState {
  stats: AdminStats;
  isLoading: boolean;
  setStats: (stats: AdminStats) => void;
  setLoading: (loading: boolean) => void;
  fetchStats: () => Promise<void>;
}

export const useAdminStore = create<AdminState>((set) => ({
  stats: {
    totalOrgs: 0,
    totalUsers: 0,
    totalMeetings: 0,
    totalHours: 0,
    processingNow: 0,
    totalGroups: 0,
  },
  isLoading: false,
  setStats: (stats) => set({ stats }),
  setLoading: (isLoading) => set({ isLoading }),
  fetchStats: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/api/admin/stats');
      set({
        stats: {
          totalOrgs: data.total_organizations || 0,
          totalUsers: data.total_users || 0,
          totalMeetings: data.total_meetings || 0,
          totalHours: 0,
          processingNow: data.active_meetings || 0,
          totalGroups: data.total_groups || 0,
        },
        isLoading: false,
      });
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
      set({ isLoading: false });
    }
  },
}));
