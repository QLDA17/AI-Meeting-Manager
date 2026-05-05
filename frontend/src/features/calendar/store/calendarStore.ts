import { create } from 'zustand';

interface CalendarState {
  selectedDate: Date;
  viewType: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';
  isScheduleModalOpen: boolean;
  
  setSelectedDate: (date: Date) => void;
  setViewType: (view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay') => void;
  toggleScheduleModal: (open?: boolean) => void;
}

export const useCalendarStore = create<CalendarState>((set) => ({
  selectedDate: new Date(),
  viewType: 'dayGridMonth',
  isScheduleModalOpen: false,

  setSelectedDate: (date) => set({ selectedDate: date }),
  setViewType: (view) => set({ viewType: view }),
  toggleScheduleModal: (open) => 
    set((state) => ({ 
      isScheduleModalOpen: open !== undefined ? open : !state.isScheduleModalOpen 
    })),
}));
