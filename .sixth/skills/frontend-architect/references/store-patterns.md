# Zustand Store Patterns for MUTI_AI

```typescript
import { create } from 'zustand';

interface MeetingState {
  currentMeetingId: string | null;
  setCurrentMeeting: (id: string) => void;
}

export const useMeetingStore = create<MeetingState>((set) => ({
  currentMeetingId: null,
  setCurrentMeeting: (id) => set({ currentMeetingId: id }),
}));
```
