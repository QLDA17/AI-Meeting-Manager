import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import viLocale from '@fullcalendar/core/locales/vi';
import { Plus, Calendar as CalendarIcon, List, Clock } from 'lucide-react';
import { Card, Button } from '@/shared/ui';
import { useCalendarStore, useAppStore } from '@/shared/lib/stores';
import ScheduleMeetingModal from '@/features/meetings/components/ScheduleMeetingModal';

const CalendarView: React.FC = () => {
  const { viewType, setViewType, setSelectedDate, toggleScheduleModal } = useCalendarStore();
  const { meetings } = useAppStore();
  const calendarRef = React.useRef<FullCalendar>(null);

  // Sync FullCalendar instance with viewType from store
  React.useEffect(() => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.changeView(viewType);
    }
  }, [viewType]);

  const events = meetings.map((m) => ({
    id: m.id,
    title: m.title,
    start: m.startTime,
    end: m.endTime || new Date(new Date(m.startTime).getTime() + 3600000).toISOString(),
    backgroundColor: m.status === 'completed' ? '#10b981' : m.status === 'live' ? '#ef4444' : '#3b82f6',
    borderColor: 'transparent',
    extendedProps: {
      status: m.status,
      groupName: m.groupName,
    },
  }));

  const handleDateClick = (arg: any) => {
    setSelectedDate(arg.date);
    toggleScheduleModal(true);
  };

  const handleEventClick = (arg: any) => {
    // Navigate to meeting detail or show preview
    console.log('Event clicked:', arg.event.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <CalendarIcon className="text-primary-600" />
            Lịch họp của tôi
          </h1>
          <p className="text-gray-500 dark:text-slate-400">
            Quản lý và theo dõi các cuộc họp sắp tới trong tổ chức.
          </p>
        </div>
        <Button 
          variant="primary" 
          className="flex items-center gap-2"
          onClick={() => toggleScheduleModal(true)}
        >
          <Plus size={18} />
          Lên lịch họp mới
        </Button>
      </div>

      <Card className="p-0 overflow-hidden border-none shadow-xl bg-white dark:bg-slate-900">
        <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
           <div className="flex bg-white dark:bg-slate-900 rounded-lg p-1 border border-gray-200 dark:border-slate-700 shadow-sm">
              <button 
                onClick={() => setViewType('dayGridMonth')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${viewType === 'dayGridMonth' ? 'bg-primary-600 text-white shadow-md' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
              >
                Tháng
              </button>
              <button 
                onClick={() => setViewType('timeGridWeek')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${viewType === 'timeGridWeek' ? 'bg-primary-600 text-white shadow-md' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
              >
                Tuần
              </button>
              <button 
                onClick={() => setViewType('timeGridDay')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition ${viewType === 'timeGridDay' ? 'bg-primary-600 text-white shadow-md' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
              >
                Ngày
              </button>
           </div>
           
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-medium">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-gray-600 dark:text-slate-400">Đã xong</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <span className="text-gray-600 dark:text-slate-400">Sắp tới</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span className="text-gray-600 dark:text-slate-400">Đang diễn ra</span>
              </div>
           </div>
        </div>

        <div className="p-4 calendar-container">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={viewType}
            locale={viLocale}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: '',
            }}
            events={events}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            height="auto"
            stickyHeaderDates={true}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              meridiem: false,
              hour12: false
            }}
            slotMinTime="07:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
            nowIndicator={true}
            dayMaxEvents={true}
          />
        </div>
      </Card>

      <ScheduleMeetingModal />

      <style>{`
        .fc {
          --fc-border-color: #e2e8f0;
          --fc-button-bg-color: #ffffff;
          --fc-button-border-color: #e2e8f0;
          --fc-button-text-color: #475569;
          --fc-button-hover-bg-color: #f8fafc;
          --fc-button-hover-border-color: #cbd5e1;
          --fc-button-active-bg-color: #f1f5f9;
          --fc-today-bg-color: #f1f5f9;
        }
        .dark .fc {
          --fc-border-color: #1e293b;
          --fc-button-bg-color: #0f172a;
          --fc-button-text-color: #94a3b8;
          --fc-button-hover-bg-color: #1e293b;
          --fc-button-active-bg-color: #334155;
          --fc-today-bg-color: #1e293b;
        }
        .fc-toolbar-title {
          font-size: 1.125rem !important;
          font-weight: 700 !important;
          color: #1e293b;
        }
        .dark .fc-toolbar-title {
          color: #f1f5f9;
        }
        .fc-col-header-cell-cushion {
          font-size: 0.875rem !important;
          font-weight: 600 !important;
          padding: 10px 0 !important;
          color: #64748b;
        }
        .fc-event {
          cursor: pointer;
          padding: 2px 4px;
          border-radius: 6px !important;
          font-size: 0.75rem !important;
          font-weight: 500 !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .fc-daygrid-event-dot {
          display: none;
        }
        .fc-v-event {
          border: none !important;
        }
      `}</style>
    </div>
  );
};

export default CalendarView;
