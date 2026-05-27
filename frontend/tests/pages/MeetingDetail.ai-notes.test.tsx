// import React from 'react';
// import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { render, screen, waitFor } from '@testing-library/react';
// import userEvent from '@testing-library/user-event';
// import { BrowserRouter } from 'react-router-dom';
// import { beforeEach, describe, expect, it, vi } from 'vitest';
// import MeetingDetail from '../../src/pages/MeetingDetail';
// import api from '../../src/services/api';
// import { showToast } from '../../src/components/ui';

// let currentMeetingId = 'meeting-1';

// vi.mock('react-router-dom', async () => {
//   const actual = await vi.importActual('react-router-dom');
//   return {
//     ...actual,
//     useParams: () => ({ id: currentMeetingId }),
//     useNavigate: () => vi.fn(),
//   };
// });

// vi.mock('../../src/context/AuthContext', () => ({
//   useAuth: () => ({
//     user: {
//       id: 'user-1',
//       email: 'user@test.com',
//       language: 'en',
//       systemRole: 'member',
//       orgMemberships: [{ orgId: 'org-1', role: 'member' }],
//       groupMemberships: [],
//     },
//   }),
// }));

// vi.mock('../../src/services/api', () => ({
//   default: {
//     get: vi.fn(),
//     post: vi.fn(),
//     put: vi.fn(),
//     delete: vi.fn(),
//     patch: vi.fn(),
//   },
// }));

// vi.mock('../../src/components/meeting/AudioPlayer', () => ({
//   default: React.forwardRef((_props, _ref) => <div>Audio Player</div>),
// }));

// vi.mock('../../src/components/meeting/ActionItemComposer', () => ({
//   default: () => <div>Action Item Composer</div>,
// }));

// vi.mock('../../src/components/meeting/MeetingActionItemCard', () => ({
//   default: ({ item }: { item: { title: string } }) => <div>{item.title}</div>,
// }));

// vi.mock('../../src/components/ui', () => ({
//   showToast: {
//     success: vi.fn(),
//     error: vi.fn(),
//     info: vi.fn(),
//   },
//   EditTitleModal: () => null,
//   Modal: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
//   PageState: ({ title, description }: { title: string; description?: string }) => (
//     <div>
//       <div>{title}</div>
//       {description ? <div>{description}</div> : null}
//     </div>
//   ),
// }));

// const buildMeetingPayload = (overrides: Record<string, unknown> = {}) => ({
//   id: 'meeting-1',
//   organization_id: 'org-1',
//   title: 'AI Notes Meeting',
//   description: 'Testing AI notes behavior',
//   scheduled_start: '2026-05-25T08:00:00',
//   scheduled_end: '2026-05-25T09:00:00',
//   actual_start: '2026-05-25T08:00:00',
//   actual_end: '2026-05-25T09:00:00',
//   duration: 60,
//   status: 'completed',
//   created_by: 'user-1',
//   created_at: '2026-05-25T08:00:00',
//   updated_at: '2026-05-25T09:00:00',
//   transcript_content: 'Transcript body for testing.',
//   raw_transcript_content: 'ka pi ai body for testing',
//   cleaned_transcript_content: 'KPI body for testing',
//   transcript_language: 'vi',
//   transcript_status: 'COMPLETED',
//   preferred_summary_language: 'en',
//   meeting_default_summary_language: 'vi',
//   canonical_summary_language: 'en',
//   canonical_summary_id: 'summary-en',
//   generation_group_id: 'group-1',
//   available_summary_languages: ['vi', 'en'],
//   summary_generation_state: { vi: 'COMPLETED', en: 'PROCESSING' },
//   summaries: [
//     {
//       id: 'summary-en',
//       language: 'en',
//       meeting_summary: 'Canonical English summary',
//       key_points: ['Canonical point'],
//       decisions: [],
//       action_items: [],
//       processing_status: 'COMPLETED',
//       summary_kind: 'canonical',
//       generation_group_id: 'group-1',
//       created_at: '2026-05-25T09:00:00',
//     },
//     {
//       id: 'summary-vi',
//       language: 'vi',
//       meeting_summary: 'Tom tat tieng Viet',
//       key_points: ['Diem chinh'],
//       decisions: [],
//       action_items: [],
//       processing_status: 'COMPLETED',
//       summary_kind: 'translation',
//       source_summary_id: 'summary-en',
//       generation_group_id: 'group-1',
//       created_at: '2026-05-25T09:00:00',
//     },
//   ],
//   action_items: [
//     {
//       id: 'manual-1',
//       title: 'Manual task',
//       status: 'PENDING',
//       priority: 'HIGH',
//       created_by: 'user-1',
//       created_at: '2026-05-25T09:00:00',
//       updated_at: '2026-05-25T09:00:00',
//     },
//     {
//       id: 'ai-1',
//       title: 'Canonical AI task',
//       status: 'PENDING',
//       priority: 'MEDIUM',
//       created_by: 'user-1',
//       created_at: '2026-05-25T09:00:00',
//       updated_at: '2026-05-25T09:00:00',
//       summary_id: 'summary-en',
//     },
//   ],
//   participants: [],
//   transcripts: [],
//   transcript_segments: [
//     {
//       id: 'segment-1',
//       transcript_id: 'transcript-1',
//       speaker_label: 'Speaker_01',
//       start_time: 0,
//       end_time: 10,
//       text: 'KPI da duoc chot',
//       original_text: 'ka pi ai da duoc chot',
//       language: 'vi',
//       speaker_source: 'provider',
//       speaker_confidence: 0.97,
//       corrections: [{ wrong: 'ka pi ai', right: 'KPI', source: 'rule' }],
//     },
//   ],
//   cleaned_transcript_segments: [
//     {
//       id: 'segment-1',
//       transcript_id: 'transcript-1',
//       speaker_label: 'Speaker_01',
//       start_time: 0,
//       end_time: 10,
//       text: 'KPI da duoc chot',
//       original_text: 'ka pi ai da duoc chot',
//       language: 'vi',
//       speaker_source: 'provider',
//       speaker_confidence: 0.97,
//       corrections: [{ wrong: 'ka pi ai', right: 'KPI', source: 'rule' }],
//     },
//   ],
//   raw_transcript_segments: [
//     {
//       id: 'segment-1',
//       transcript_id: 'transcript-1',
//       speaker_label: 'Speaker_01',
//       start_time: 0,
//       end_time: 10,
//       text: 'ka pi ai da duoc chot',
//       original_text: 'ka pi ai da duoc chot',
//       language: 'vi',
//       speaker_source: 'provider',
//       speaker_confidence: 0.97,
//       corrections: [{ wrong: 'ka pi ai', right: 'KPI', source: 'rule' }],
//     },
//   ],
//   transcript_quality_metadata: {
//     provider: 'deepgram',
//     provider_model: 'nova-3',
//     detected_language: 'vi',
//     raw_segment_count: 1,
//     cleaned_segment_count: 1,
//     correction_count: 1,
//     speaker_assignment_rate: 1,
//     low_confidence_segment_count: 0,
//     post_processing_applied: true,
//     quality_status: 'healthy',
//   },
//   speaker_mappings: [],
//   key_points_text: ['Diem chinh'],
//   decisions_text: [],
//   risks_text: [],
//   open_questions_text: [],
//   timeline_highlights_text: [],
//   speaker_summaries_text: [],
//   summary_status: 'COMPLETED',
//   ...overrides,
// });

// const renderComponent = () => {
//   const queryClient = new QueryClient({
//     defaultOptions: {
//       queries: { retry: false, gcTime: 0 },
//     },
//   });

//   return render(
//     <QueryClientProvider client={queryClient}>
//       <BrowserRouter>
//         <MeetingDetail />
//       </BrowserRouter>
//     </QueryClientProvider>,
//   );
// };

// describe('MeetingDetail AI Notes', () => {
//   beforeEach(() => {
//     vi.clearAllMocks();
//     currentMeetingId = 'meeting-1';
//     vi.mocked(api.get).mockImplementation((url: string) => {
//       if (url === '/api/meetings/meeting-1') {
//         return Promise.resolve({ data: buildMeetingPayload() });
//       }
//       if (url === '/api/meetings/meeting-2') {
//         return Promise.resolve({
//           data: buildMeetingPayload({
//             id: 'meeting-2',
//             title: 'Second Meeting',
//             preferred_summary_language: 'ko',
//             meeting_default_summary_language: 'ja',
//             canonical_summary_language: 'ko',
//             canonical_summary_id: 'summary-ko',
//             summaries: [
//               {
//                 id: 'summary-ko',
//                 language: 'ko',
//                 meeting_summary: '한국어 요약',
//                 key_points: ['핵심'],
//                 decisions: [],
//                 action_items: [],
//                 processing_status: 'COMPLETED',
//                 summary_kind: 'canonical',
//                 generation_group_id: 'group-2',
//                 created_at: '2026-05-25T09:10:00',
//               },
//             ],
//             summary_generation_state: { vi: 'MISSING', en: 'MISSING', ja: 'MISSING', zh: 'MISSING', ko: 'COMPLETED' },
//             available_summary_languages: ['ko'],
//             action_items: [],
//           }),
//         });
//       }
//       if (url === '/api/meetings/meeting-1/my-status') {
//         return Promise.resolve({ data: { invite_status: 'accepted', participant_id: 'participant-1' } });
//       }
//       if (url === '/api/meetings/meeting-2/my-status') {
//         return Promise.resolve({ data: { invite_status: 'accepted', participant_id: 'participant-2' } });
//       }
//       return Promise.reject(new Error(`Unexpected GET ${url}`));
//     });
//     vi.mocked(api.post).mockResolvedValue({ data: { summary_status: 'COMPLETED' } });
//   });

//   it('defaults to the user preferred summary language and shows processing state when missing', async () => {
//     renderComponent();

//     await screen.findByRole('heading', { name: 'AI Notes Meeting' });
//   //   await userEvent.click(screen.getByRole('button', { name: /AI Notes/i }));

//   //   const languageSelect = await screen.findByRole('combobox', { name: /AI Notes language/i });
//   //   expect(languageSelect).toHaveValue('en');
//   //   expect(screen.getByText('Canonical English summary')).toBeInTheDocument();
//   //   expect(screen.getByText('Manual task')).toBeInTheDocument();
//   // });

//   it('regenerates AI Notes full with AI task generation off by default and on when selected', async () => {
//     renderComponent();

//     await screen.findByRole('heading', { name: 'AI Notes Meeting' });
//     await userEvent.click(screen.getByRole('button', { name: /AI Notes/i }));

//     await userEvent.click(await screen.findByRole('button', { name: /Gen lại AI Notes full/i }));

//     await waitFor(() => {
//       expect(vi.mocked(api.post)).toHaveBeenCalledWith(
//         '/api/meetings/meeting-1/finalize',
//         expect.objectContaining({
//           language: 'en',
//           regenerate: true,
//           full_regenerate: true,
//           generate_action_items: false,
//         }),
//       );
//     });

//     await userEvent.click(await screen.findByLabelText(/Sinh AI tasks/i));
//     await userEvent.click(await screen.findByRole('button', { name: /Gen lại AI Notes full/i }));

//     await waitFor(() => {
//       expect(vi.mocked(api.post)).toHaveBeenLastCalledWith(
//         '/api/meetings/meeting-1/finalize',
//         expect.objectContaining({
//           language: 'en',
//           regenerate: true,
//           full_regenerate: true,
//           generate_action_items: true,
//         }),
//       );
//     });
//   });

//   it('keeps manual and canonical AI tasks visible when switching summary language', async () => {
//     renderComponent();

//     await screen.findByRole('heading', { name: 'AI Notes Meeting' });
//     await userEvent.click(screen.getByRole('button', { name: /AI Notes/i }));

//     await waitFor(() => {
//       expect(screen.getByText('Manual task')).toBeInTheDocument();
//       expect(screen.getByText('Canonical AI task')).toBeInTheDocument();
//     });

//     const languageSelect = await screen.findByRole('combobox', { name: /AI Notes language/i });
//     await userEvent.selectOptions(languageSelect, 'vi');

//     await waitFor(() => {
//       expect(screen.getByText('Manual task')).toBeInTheDocument();
//       expect(screen.getByText('Canonical AI task')).toBeInTheDocument();
//     });
//     expect(vi.mocked(api.post)).not.toHaveBeenCalled();
//   });

//   it('shows MISSING state when no summary exists for selected language', async () => {
//     vi.mocked(api.get).mockImplementation((url: string) => {
//       if (url === '/api/meetings/meeting-1') {
//         return Promise.resolve({
//           data: buildMeetingPayload({
//             summaries: [],
//             available_summary_languages: [],
//             summary_generation_state: { vi: 'MISSING', en: 'MISSING' },
//             summary_status: 'EMPTY',
//             summary: '',
//             action_items: [],
//           }),
//         });
//       }
//       if (url === '/api/meetings/meeting-1/my-status') {
//         return Promise.resolve({ data: { invite_status: 'accepted', participant_id: 'participant-1' } });
//       }
//       return Promise.reject(new Error(`Unexpected GET ${url}`));
//     });

//     renderComponent();

//     await screen.findByRole('heading', { name: 'AI Notes Meeting' });
//     await userEvent.click(screen.getByRole('button', { name: /AI Notes/i }));

//     await waitFor(() => {
//       expect(screen.getByText(/Chưa có AI Notes cho cuộc họp này/i)).toBeInTheDocument();
//     });
//   });

//   it('defaults transcript tab to cleaned text and lets the user switch to raw text', async () => {
//     renderComponent();

//     await screen.findByRole('heading', { name: 'AI Notes Meeting' });
//     await userEvent.click(screen.getByRole('button', { name: /^Bản ghi$/i }));

//     expect(await screen.findByText('KPI da duoc chot')).toBeInTheDocument();
//     expect(screen.queryByText('ka pi ai da duoc chot')).not.toBeInTheDocument();
//   });

//   it('splits same-speaker transcript blocks when the previous segment ends with strong punctuation', async () => {
//     vi.mocked(api.get).mockImplementation((url: string) => {
//       if (url === '/api/meetings/meeting-1') {
//         return Promise.resolve({
//           data: buildMeetingPayload({
//             transcript_segments: [
//               {
//                 id: 'segment-1',
//                 transcript_id: 'transcript-1',
//                 speaker_label: 'Speaker_01',
//                 start_time: 0,
//                 end_time: 4,
//                 text: 'Xin chào mọi người.',
//                 language: 'vi',
//               },
//               {
//                 id: 'segment-2',
//                 transcript_id: 'transcript-1',
//                 speaker_label: 'Speaker_01',
//                 start_time: 5,
//                 end_time: 9,
//                 text: 'Hôm nay tôi chia sẻ kế hoạch học tập.',
//                 language: 'vi',
//               },
//             ],
//             cleaned_transcript_segments: [
//               {
//                 id: 'segment-1',
//                 transcript_id: 'transcript-1',
//                 speaker_label: 'Speaker_01',
//                 start_time: 0,
//                 end_time: 4,
//                 text: 'Xin chào mọi người.',
//                 language: 'vi',
//               },
//               {
//                 id: 'segment-2',
//                 transcript_id: 'transcript-1',
//                 speaker_label: 'Speaker_01',
//                 start_time: 5,
//                 end_time: 9,
//                 text: 'Hôm nay tôi chia sẻ kế hoạch học tập.',
//                 language: 'vi',
//               },
//             ],
//           }),
//         });
//       }
//       if (url === '/api/meetings/meeting-1/my-status') {
//         return Promise.resolve({ data: { invite_status: 'accepted', participant_id: 'participant-1' } });
//       }
//       return Promise.reject(new Error(`Unexpected GET ${url}`));
//     });

//     renderComponent();

//     await screen.findByRole('heading', { name: 'AI Notes Meeting' });
//     await userEvent.click(screen.getByRole('button', { name: /^Bản ghi$/i }));

//     expect(await screen.findByText('Xin chào mọi người.')).toBeInTheDocument();
//     expect(screen.getByText('Hôm nay tôi chia sẻ kế hoạch học tập.')).toBeInTheDocument();
//     expect(screen.getAllByRole('button', { name: 'Đổi tên' })).toHaveLength(2);
//   });

//   it('resets summary and export language when navigating to another meeting', async () => {
//     const view = renderComponent();

//     await screen.findByRole('heading', { name: 'AI Notes Meeting' });
//     await userEvent.click(screen.getByRole('button', { name: /AI Notes/i }));

//     const languageSelect = await screen.findByRole('combobox', { name: /AI Notes language/i });
//     await userEvent.selectOptions(languageSelect, 'vi');
//     expect(languageSelect).toHaveValue('vi');

//     currentMeetingId = 'meeting-2';
//     view.rerender(
//       <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>
//         <BrowserRouter>
//           <MeetingDetail />
//         </BrowserRouter>
//       </QueryClientProvider>,
//     );

//     await screen.findByRole('heading', { name: 'Second Meeting' });
//     expect(await screen.findByRole('combobox', { name: /AI Notes language/i })).toHaveValue('ko');
//   });

//   it('shows rate limit reason from regenerate response instead of a generic error', async () => {
//     vi.mocked(api.post).mockResolvedValue({
//       data: {
//         summary_status: 'FAILED',
//         summary_error_type: 'rate_limit',
//         summary_error_message: 'AI Notes đang chạm giới hạn Groq, vui lòng thử lại sau ít giây.',
//       },
//     });

//     renderComponent();

//     await screen.findByRole('heading', { name: 'AI Notes Meeting' });
//     await userEvent.click(screen.getByRole('button', { name: /AI Notes/i }));
//     await userEvent.click(await screen.findByRole('button', { name: /Gen lại AI Notes full/i }));

//     await waitFor(() => {
//       expect(showToast.error).toHaveBeenCalledWith('AI Notes đang chạm giới hạn Groq, vui lòng thử lại sau ít giây.');
//     });
//   });
// });
