import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  Sparkles,
  Calendar,
  Clock,
  Users,
  Key,
  Target,
  Download,
  Share2,
  Star,
  MoreVertical,
  CheckCircle2,
  Globe,
  AlertCircle,
} from 'lucide-react';
import { getGroupById, getOrgById, getUserById } from '@/shared/mockData';
import { useAppStore } from '@/shared/lib/stores';
import { format } from 'date-fns';
import AudioPlayer from '@/features/meetings/components/AudioPlayer';

type DetailTab = 'summary' | 'transcript' | 'ai-notes' | 'actions';

const MeetingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getMeetingById, updateMeeting } = useAppStore();
  const [activeTab, setActiveTab] = useState<DetailTab>('summary');
  const [isStarred, setIsStarred] = useState(false);

  const meeting = getMeetingById(id || '');
  const group = meeting ? getGroupById(meeting.groupId) : null;
  const org = meeting ? getOrgById(meeting.orgId) : null;
  const creator = meeting ? getUserById(meeting.createdBy) : null;

  if (!meeting) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-6 rounded-full bg-red-50 p-6 dark:bg-red-900/20">
          <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 dark:text-slate-100">Không tìm thấy cuộc họp</h2>
        <p className="mt-4 max-w-md text-lg text-gray-500 dark:text-slate-400">
          ID cuộc họp <span className="font-mono font-bold text-primary-600">"{id}"</span> không tồn tại trong hệ thống hoặc bạn đã mất quyền truy cập.
        </p>
        <div className="mt-10 flex gap-4">
          <button
            onClick={() => navigate('/meetings')}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 font-bold text-white transition hover:bg-primary-700 shadow-lg shadow-primary-500/20"
          >
            <ArrowLeft size={18} />
            Quay lại danh sách
          </button>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 font-bold text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const toggleStar = () => {
    setIsStarred(!isStarred);
    updateMeeting(meeting.id, { isPinned: !isStarred });
  };

  const tabs: Array<{ key: DetailTab; label: string; icon: React.ReactNode }> = [
    { key: 'summary', label: 'Tóm tắt', icon: <FileText size={16} /> },
    { key: 'transcript', label: 'Bản ghi', icon: <MessageSquare size={16} /> },
    { key: 'actions', label: 'Việc cần làm', icon: <CheckCircle2 size={16} /> },
    { key: 'ai-notes', label: 'AI Notes', icon: <Sparkles size={16} /> },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header & Breadcrumbs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <nav className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-slate-400">
            <Link to="/meetings" className="transition hover:text-primary-600">Cuộc họp</Link>
            <span className="text-gray-300">/</span>
            {org && (
              <>
                <span className="text-gray-400">{org.name}</span>
                <span className="text-gray-300">/</span>
              </>
            )}
            {group && (
              <>
                <Link to={`/groups/${group.id}`} className="transition hover:text-primary-600">{group.name}</Link>
                <span className="text-gray-300">/</span>
              </>
            )}
            <span className="max-w-[150px] truncate font-bold text-gray-900 dark:text-slate-100">{meeting.title}</span>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleStar}
              className={`rounded-xl border border-gray-200 p-2.5 transition-all hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800 ${
                isStarred || meeting.isPinned ? 'text-amber-500' : 'text-gray-400'
              }`}
            >
              <Star size={18} fill={(isStarred || meeting.isPinned) ? 'currentColor' : 'none'} />
            </button>
            <div className="relative group/menu">
              <button className="rounded-xl border border-gray-200 p-2.5 text-gray-400 transition-all hover:bg-gray-50 dark:border-slate-700 dark:hover:bg-slate-800">
                <MoreVertical size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-slate-100">
              {meeting.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-medium text-gray-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 dark:bg-slate-800">
                <Calendar size={14} className="text-gray-400" />
                {format(new Date(meeting.startTime), 'dd/MM/yyyy')}
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 dark:bg-slate-800">
                <Clock size={14} className="text-gray-400" />
                {meeting.duration} phút
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 dark:bg-slate-800">
                <Users size={14} className="text-gray-400" />
                {meeting.attendees?.length || 0} người tham gia
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
              <Download size={16} />
              Xuất PDF
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-500/20 transition hover:bg-primary-700">
              <Share2 size={16} />
              Chia sẻ
            </button>
          </div>
        </div>
      </motion.div>

      {/* Audio Player Sticky */}
      <div className="sticky top-4 z-30">
        <AudioPlayer src={meeting.audioUrl} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content Area */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            {/* Tab Headers */}
            <div className="flex border-b border-gray-100 bg-gray-50/50 px-2 dark:border-slate-800 dark:bg-slate-800/50">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-bold transition-all ${
                    activeTab === tab.key
                      ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-8">
              <AnimatePresence mode="wait">
                {/* Summary Tab */}
                {activeTab === 'summary' && (
                  <motion.div
                    key="summary"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-8"
                  >
                    <section>
                      <h3 className="mb-4 text-lg font-black text-gray-900 dark:text-slate-100">
                        Tóm tắt cuộc họp
                      </h3>
                      <div className="rounded-2xl border border-primary-100 bg-primary-50/30 p-6 leading-relaxed text-gray-800 dark:border-primary-900/20 dark:bg-primary-900/10 dark:text-slate-300">
                        {meeting.summary || 'Chưa có tóm tắt cho cuộc họp này.'}
                      </div>
                    </section>

                    {meeting.keyPoints && meeting.keyPoints.length > 0 && (
                      <section>
                        <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-gray-900 dark:text-slate-100">
                          <Key size={20} className="text-blue-500" />
                          Điểm chính thảo luận
                        </h3>
                        <div className="grid gap-3">
                          {meeting.keyPoints.map((point, idx) => (
                            <div
                              key={idx}
                              className="group flex items-start gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition hover:bg-white hover:shadow-md dark:border-slate-800 dark:bg-slate-800/30 dark:hover:bg-slate-800"
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                {idx + 1}
                              </span>
                              <p className="text-sm font-medium leading-relaxed text-gray-700 dark:text-slate-300">
                                {point}
                              </p>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {meeting.decisions && meeting.decisions.length > 0 && (
                      <section>
                        <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-gray-900 dark:text-slate-100">
                          <Target size={20} className="text-green-500" />
                          Quyết định đã thống nhất
                        </h3>
                        <div className="space-y-3">
                          {meeting.decisions.map((decision, idx) => (
                            <div key={idx} className="flex items-start gap-3 rounded-xl border border-green-100 bg-green-50/30 p-4 dark:border-green-900/20 dark:bg-green-900/10">
                              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600 dark:text-green-400" />
                              <p className="text-sm font-bold text-green-900 dark:text-green-100">{decision}</p>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </motion.div>
                )}

                {/* Transcript Tab */}
                {activeTab === 'transcript' && (
                  <motion.div
                    key="transcript"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">
                        Bản ghi chi tiết
                      </h3>
                      <button className="text-sm font-bold text-primary-600 hover:text-primary-700">
                        Tải bản ghi (.txt)
                      </button>
                    </div>
                    
                    {meeting.transcriptUrl ? (
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-sm text-gray-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                        <p className="italic">Bản ghi đầy đủ có thể tải về từ đường dẫn đính kèm.</p>
                        <a
                          href={meeting.transcriptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block font-bold text-primary-600 hover:underline"
                        >
                          Xem bản ghi →
                        </a>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center dark:border-slate-700 dark:bg-slate-800/30">
                        <MessageSquare size={32} className="mx-auto mb-3 text-gray-300 dark:text-slate-600" />
                        <p className="text-sm font-bold text-gray-500 dark:text-slate-400">
                          Chưa có bản ghi cho cuộc họp này
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          Bản ghi sẽ xuất hiện sau khi AI xử lý xong file âm thanh
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Actions Tab */}
                {activeTab === 'actions' && (
                  <motion.div
                    key="actions"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-4"
                  >
                    <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">
                      Việc cần làm được trích xuất
                    </h3>
                    {(!meeting.decisions || meeting.decisions.length === 0) ? (
                      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center dark:border-slate-700 dark:bg-slate-800/30">
                        <CheckCircle2 size={32} className="mx-auto mb-3 text-gray-300 dark:text-slate-600" />
                        <p className="text-sm font-bold text-gray-500 dark:text-slate-400">
                          Chưa có việc cần làm nào được trích xuất
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          AI sẽ tự động trích xuất sau khi xử lý xong
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-slate-800">
                        {meeting.decisions.map((decision, i) => (
                          <div key={i} className="flex items-center justify-between py-4">
                            <div className="flex items-center gap-3">
                              <input type="checkbox" className="h-5 w-5 rounded-md border-gray-300 text-primary-600" readOnly />
                              <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{decision}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* AI Notes Tab */}
                {activeTab === 'ai-notes' && (
                  <motion.div
                    key="ai-notes"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-6"
                  >
                    <div className="rounded-2xl border border-primary-200 bg-primary-50/20 p-6 dark:border-primary-900/30 dark:bg-primary-900/10">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-lg bg-primary-600 p-2 text-white">
                          <Sparkles size={20} />
                        </div>
                        <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">AI Analysis Insights</h3>
                      </div>
                      
                      <div className="space-y-4 text-sm text-gray-700 dark:text-slate-300">
                        <div>
                          <p className="mb-1 font-black text-primary-700 dark:text-primary-400 uppercase tracking-wide text-xs">Phân tích sắc thái</p>
                          <p>Cuộc họp diễn ra với không khí tích cực và đồng thuận cao. Speaker 1 thể hiện vai trò dẫn dắt tốt.</p>
                        </div>
                        <div>
                          <p className="mb-1 font-black text-primary-700 dark:text-primary-400 uppercase tracking-wide text-xs">Các rủi ro tiềm ẩn</p>
                          <ul className="list-inside list-disc space-y-1">
                            <li>Thiết kế Org Panel có thể chậm tiến độ do thiếu nhân sự.</li>
                            <li>Báo cáo Sprint 25 cần dữ liệu từ ban kế toán.</li>
                          </ul>
                        </div>
                        <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800">
                          <p className="mb-2 font-bold flex items-center gap-2">
                            <Globe size={14} className="text-blue-500" />
                            Đề xuất tiếp theo:
                          </p>
                          <p className="italic text-gray-600 dark:text-slate-400">
                            "Nên tổ chức một buổi sync-up nhanh giữa team thiết kế và team dev để chốt các yêu cầu kỹ thuật của Org Panel."
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
              Thông tin cuộc họp
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400">Tổ chức</p>
                <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{org?.name || '---'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Nhóm</p>
                <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{group?.name || '---'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Người tạo</p>
                <p className="text-sm font-bold text-gray-900 dark:text-slate-100">
                  {creator?.displayName || creator?.email || '---'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-4 text-sm font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
              Người tham dự ({meeting.attendees?.length || 0})
            </h3>
            <div className="space-y-3">
              {meeting.attendees?.map((attendee) => (
                <div key={attendee.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-black text-primary-700 dark:bg-primary-900/30 dark:text-primary-200">
                    {(attendee.displayName?.[0] || 'U').toUpperCase()}
                  </div>
                  <span className="text-sm font-bold text-gray-700 dark:text-slate-300">
                    {attendee.displayName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingDetail;
