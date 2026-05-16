export const toLocalDateStr = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const toLocalTimeStr = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

export const buildLocalDateTime = (date: string, time: string) => {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute);
};

export const toMeetingApiDateTime = (date: Date) => date.toISOString();

export const getMeetingStart = (meeting: { scheduled_start?: string; startTime?: string }) =>
  meeting.scheduled_start || meeting.startTime;

export const getMeetingEnd = (meeting: { scheduled_end?: string; endTime?: string }) =>
  meeting.scheduled_end || meeting.endTime;
