import React from 'react';
import CalendarView from '../../features/calendar/CalendarView';

const CalendarPage: React.FC = () => {
  return (
    <div className="mx-auto w-full max-w-7xl pb-10">
      <CalendarView />
    </div>
  );
};

export default CalendarPage;
