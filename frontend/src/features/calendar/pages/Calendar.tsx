import React from 'react';
import CalendarView from '@/features/calendar/components/CalendarView';

const CalendarPage: React.FC = () => {
  return (
    <div className="container mx-auto py-6 px-4 md:px-0">
      <CalendarView />
    </div>
  );
};

export default CalendarPage;
