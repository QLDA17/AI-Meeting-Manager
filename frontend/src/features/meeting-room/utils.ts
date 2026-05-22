import type { MeetingDetail } from '../../types';

export type ParticipantRole = 'organizer' | 'presenter' | 'attendee';

export interface RoomTranscriptChunk {
  id: string;
  userId?: string;
  chunkIndex: number;
  speaker?: string;
  text: string;
  segments: any[];
  timestamp: number;
  source?: string;
}

export const normalizeRoomTranscriptChunk = (
  chunk: any,
  fallbackIndex: number,
  source: string,
): RoomTranscriptChunk => {
  const chunkIndex = Number(chunk?.chunkIndex ?? chunk?.chunk_index ?? fallbackIndex);
  const userId = chunk?.userId ?? chunk?.user_id;
  const timestamp = chunk?.timestamp ? new Date(chunk.timestamp).getTime() : Date.now();
  const segments = Array.isArray(chunk?.segments) ? chunk.segments : [];
  const text = chunk?.text || segments.map((segment: any) => segment.text).filter(Boolean).join(' ');
  return {
    id: chunk?.id || `${source}:${userId || chunk?.speaker || 'unknown'}:${chunkIndex}`,
    userId,
    chunkIndex,
    speaker: chunk?.speaker || segments[0]?.speaker_display_name || segments[0]?.speaker,
    text,
    segments,
    timestamp,
    source,
  };
};

export const aiNotesFromMeeting = (meeting: MeetingDetail | null) => {
  if (!meeting || (!meeting.meetingSummaryText && !meeting.keyPointsText?.length)) return null;
  return {
    meeting_summary: meeting.meetingSummaryText || '',
    key_points: meeting.keyPointsText || [],
    decisions: meeting.decisionsText || [],
    risks: meeting.risksText || [],
    open_questions: meeting.openQuestionsText || [],
    timeline_highlights: meeting.timelineHighlightsText || [],
    speaker_summaries: meeting.speakerSummariesText || [],
    processing_status: meeting.summaryStatus,
  };
};

export const normalizeParticipantRole = (value: unknown): ParticipantRole => {
  const role = String(value || '').toLowerCase();
  if (role.includes('organizer') || role.includes('host')) return 'organizer';
  if (role.includes('presenter')) return 'presenter';
  return 'attendee';
};

export const dedupeActionItems = (items: any[]) => {
  const byId = new Map<string, any>();
  items.forEach((item) => {
    if (!item?.id) return;
    byId.set(item.id, item);
  });
  return Array.from(byId.values());
};
