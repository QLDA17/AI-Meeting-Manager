import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Key,
  MessageSquare,
  Pencil,
  RefreshCw,
  Share2,
  Sparkles,
  Star,
  Target,
  Trash2,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import { normalizeMeetingDetail } from '../services/mappers';
import type { MeetingDetail as MeetingDetailType } from '../types';
import AudioPlayer from '../components/meeting/AudioPlayer';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import { showToast } from '../components/ui';

type DetailTab = 'summary' | 'transcript' | 'actions' | 'ai-notes';

const MeetingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSystemAdmin, isOrgAdmin, isGroupAdmin, isViewer } = usePermission();
  const [activeTab, setActiveTab] = useState<DetailTab>('summary');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [summaryLanguage, setSummaryLanguage] = useState<string>('vi');

  const query = useQuery({
    queryKey: ['meeting-detail', id],
    enabled: Boolean(id),
    queryFn: async (): Promise<MeetingDetailType> => {
      const response = await api.get(`/api/meetings/${id}`);
      return normalizeMeetingDetail(response.data);
    },
  });

  const meeting = query.data;
  const actionItems = meeting?.actionItems || [];
  const keyPoints = meeting?.keyPointsText?.length ? meeting.keyPointsText : meeting?.keyPoints || [];
  const decisions = meeting?.decisionsText?.length ? meeting.decisionsText : meeting?.decisions || [];
  const transcript = useMemo(() => {
    if (!meeting) return '';
    return meeting.transcriptContent || meeting.transcripts[0]?.content || '';
  }, [meeting]);
  const summary = meeting?.meetingSummaryText || meeting?.summary || '';
  const summaryFailed = meeting?.summaryStatus === 'FAILED';
  const summaryErrorText = meeting?.summaryErrorText || 'AgentRouter khong tao duoc AI Notes. Kiem tra token, model hoac log backend.';
  const currentLanguage = meeting?.transcriptLanguage || summaryLanguage;

  const nowMs = Date.now();
  const startMs = meeting ? new Date(meeting.startTime).getTime() : nowMs;
  const isUpcomingMeeting = meeting
    ? meeting.status === 'upcoming' || (startMs > nowMs && meeting.status !== 'completed')
    : false;
  const canManageMeeting = Boolean(
    meeting &&
      user &&
      !isViewer &&
      (isSystemAdmin || isOrgAdmin || isGroupAdmin || meeting.createdBy === user.id),
  );

  const handleRegenerateAINotes = async (lang?: string) => {
    if (!id || !transcript) return;
    const targetLang = lang || summaryLanguage;
    setIsRegenerating(true);
    try {
      const response = await api.post(`/api/meetings/${id}/finalize`, {
        transcript,
        segments: [],
        language: targetLang,
      });
      const result = response.data;
      if (result?.summary_status === "COMPLETED") {
        showToast.success("Đã tạo lại AI Notes thành công!");
        query.refetch();
      } else {
        showToast.error("Tạo AI Notes thất bại. Kiểm tra log backend.");
      }
    } catch (err: any) {
      showToast.error(err?.response?.data?.detail || "Lỗi khi tạo lại AI Notes");
    } finally {
      setIsRegenerating(false);
    }
  };

  if (query.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (query.isError || !meeting) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-3xl border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-6 rounded-full bg-red-50 p-6 dark:bg-red-900/20">
          <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 dark:text-slate-100">Khong tim thay cuoc hop</h2>
        <p className="mt-4 max-w-md text-lg text-gray-500 dark:text-slate-400">
          Cuoc hop nay khong ton tai hoac ban khong con quyen truy cap.
        </p>
        <button
          onClick={() => navigate('/meetings')}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 font-bold text-white transition hover:bg-primary-700"
        >
          <ArrowLeft size={18} />
          Quay lai danh sach
        </button>
      </div>
    );
  }

  const tabs: Array<{ key: DetailTab; label: string; icon: React.ReactNode }> = [
    { key: 'summary', label: 'Tom tat', icon: <FileText size={16} /> },
    { key: 'transcript', label: 'Ban ghi', icon: <MessageSquare size={16} /> },
    { key: 'actions', label: 'Viec can lam', icon: <CheckCircle2 size={16} /> },
    { key: 'ai-notes', label: 'AI Notes', icon: <Sparkles size={16} /> },
  ];

  const handleEditMeeting = async () => {
    const nextTitle = window.prompt('Nhap tieu de moi cho cuoc hop', meeting.title);
    if (!nextTitle || !nextTitle.trim()) return;
    try {
      await api.put(`/api/meetings/${meeting.id}`, { title: nextTitle.trim() });
      window.location.reload();
    } catch (err: any) {
      window.alert(err?.response?.data?.detail || 'Khong the cap nhat cuoc hop');
    }
  };

  const handleDeleteMeeting = async () => {
    const confirmed = window.confirm(`Xoa cuoc hop "${meeting.title}"?`);
    if (!confirmed) return;
    try {
      await api.delete(`/api/meetings/${meeting.id}`);
      navigate('/meetings');
    } catch (err: any) {
      window.alert(err?.response?.data?.detail || 'Khong the xoa cuoc hop');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center justify-between">
          <nav className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-slate-400">
            <Link to="/meetings" className="transition hover:text-primary-600">Cuoc hop</Link>
            <span>/</span>
            {meeting.organization && (
              <>
                <span>{meeting.organization.name}</span>
                <span>/</span>
              </>
            )}
            {meeting.group && (
              <>
                <Link to={`/groups/${meeting.group.id}`} className="transition hover:text-primary-600">{meeting.group.name}</Link>
                <span>/</span>
              </>
            )}
            <span className="max-w-[150px] truncate font-bold text-gray-900 dark:text-slate-100">{meeting.title}</span>
          </nav>

          {meeting.isPinned && (
            <div className="rounded-xl border border-amber-200 p-2.5 text-amber-500">
              <Star size={18} fill="currentColor" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-slate-100">{meeting.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-medium text-gray-500 dark:text-slate-400">
              <div className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 dark:bg-slate-800">
                <Calendar size={14} />
                {format(new Date(meeting.startTime), 'dd/MM/yyyy')}
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 dark:bg-slate-800">
                <Clock size={14} />
                {meeting.duration} phut
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 dark:bg-slate-800">
                <Users size={14} />
                {meeting.attendees.length} nguoi tham gia
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canManageMeeting && (
              <>
                <button
                  onClick={handleEditMeeting}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <Pencil size={16} />
                  Sua
                </button>
                <button
                  onClick={handleDeleteMeeting}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <Trash2 size={16} />
                  Xoa
                </button>
              </>
            )}
            <button
              disabled={isUpcomingMeeting}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Download size={16} />
              Xuat
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-700">
              <Share2 size={16} />
              Chia se
            </button>
          </div>
        </div>
      </motion.div>

      {!isUpcomingMeeting && (
        <div className="sticky top-4 z-30">
          <AudioPlayer src={meeting.audioUrl} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {isUpcomingMeeting ? (
            <div className="rounded-3xl border border-blue-200 bg-blue-50/40 p-8 shadow-sm dark:border-blue-900/30 dark:bg-blue-900/10">
              <h3 className="text-xl font-black text-blue-900 dark:text-blue-200">Cuoc hop sap toi</h3>
              <p className="mt-3 text-sm leading-relaxed text-blue-800 dark:text-blue-300">
                Cuoc hop nay chua dien ra nen chua co ban ghi, tom tat AI va viec can lam.
                Sau khi hop ket thuc va he thong xu ly xong, cac noi dung nay se tu dong xuat hien tai day.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-blue-700 dark:text-blue-300">
                <span className="rounded-full bg-white/70 px-3 py-1 dark:bg-slate-900/40">Trang thai: Sap toi</span>
                <span className="rounded-full bg-white/70 px-3 py-1 dark:bg-slate-900/40">
                  Bat dau: {format(new Date(meeting.startTime), 'HH:mm dd/MM/yyyy')}
                </span>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
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

              <div className="p-8">
                <AnimatePresence mode="wait">
                  {activeTab === 'summary' && (
                    <motion.div key="summary" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-8">
                      <section>
                        <h3 className="mb-4 text-lg font-black text-gray-900 dark:text-slate-100">Tom tat cuoc hop</h3>
                        <div className="rounded-2xl border border-primary-100 bg-primary-50/30 p-6 leading-relaxed text-gray-800 dark:border-primary-900/20 dark:bg-primary-900/10 dark:text-slate-300">
                          {summary || 'Chua co tom tat cho cuoc hop nay.'}
                        </div>
                      </section>

                      {keyPoints.length > 0 && (
                        <section>
                          <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-gray-900 dark:text-slate-100">
                            <Key size={20} className="text-blue-500" />
                            Diem chinh thao luan
                          </h3>
                          <div className="grid gap-3">
                            {keyPoints.map((point, index) => (
                              <div key={`${point}-${index}`} className="flex items-start gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                  {index + 1}
                                </span>
                                <p className="text-sm font-medium leading-relaxed text-gray-700 dark:text-slate-300">{point}</p>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {decisions.length > 0 && (
                        <section>
                          <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-gray-900 dark:text-slate-100">
                            <Target size={20} className="text-green-500" />
                            Quyet dinh da thong nhat
                          </h3>
                          <div className="space-y-3">
                            {decisions.map((decision, index) => (
                              <div key={`${decision}-${index}`} className="flex items-start gap-3 rounded-xl border border-green-100 bg-green-50/30 p-4 dark:border-green-900/20 dark:bg-green-900/10">
                                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600 dark:text-green-400" />
                                <p className="text-sm font-bold text-green-900 dark:text-green-100">{decision}</p>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'transcript' && (
                    <motion.div key="transcript" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">Ban ghi chi tiet</h3>
                        {meeting.transcriptUrl && (
                          <a href={meeting.transcriptUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-primary-600 hover:text-primary-700">
                            Tai ban ghi
                          </a>
                        )}
                      </div>
                      {transcript ? (
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-6 text-sm leading-7 text-gray-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
                          {transcript}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center dark:border-slate-700 dark:bg-slate-800/30">
                          <MessageSquare size={32} className="mx-auto mb-3 text-gray-300 dark:text-slate-600" />
                          <p className="text-sm font-bold text-gray-500 dark:text-slate-400">Chua co ban ghi cho cuoc hop nay</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'actions' && (
                    <motion.div key="actions" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                      <h3 className="text-lg font-black text-gray-900 dark:text-slate-100">Viec can lam</h3>
                      {actionItems.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center dark:border-slate-700 dark:bg-slate-800/30">
                          <CheckCircle2 size={32} className="mx-auto mb-3 text-gray-300 dark:text-slate-600" />
                          <p className="text-sm font-bold text-gray-500 dark:text-slate-400">Chua co viec can lam nao duoc trich xuat</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {actionItems.map((item) => (
                            <div key={item.id} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="font-bold text-gray-900 dark:text-slate-100">{item.title}</p>
                                  {item.description && (
                                    <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">{item.description}</p>
                                  )}
                                </div>
                                <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary-700 dark:bg-primary-900/20 dark:text-primary-300">
                                  {item.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {activeTab === 'ai-notes' && (
                    <motion.div key="ai-notes" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-6">
                      <div>
                        <h3 className="flex items-center gap-2 text-lg font-black text-gray-900 dark:text-slate-100">
                          <Sparkles size={20} className="text-primary-500" />
                          AI Notes
                        </h3>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-gray-400">
                          {meeting.transcriptLanguage || 'vi'} / {keyPoints.length} diem chinh / {actionItems.length} viec can lam
                        </p>
                      </div>

                      {summaryFailed && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                          <div className="flex items-start gap-3">
                            <AlertCircle size={20} className="mt-0.5 shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-black uppercase tracking-widest">AI Notes dang loi</p>
                              <p className="mt-2 text-sm leading-6">{summaryErrorText}</p>
                              {(meeting.summaryProvider || meeting.summaryModelName) && (
                                <p className="mt-3 text-xs font-bold uppercase tracking-widest text-red-500 dark:text-red-300">
                                  {meeting.summaryProvider || 'router'} / {meeting.summaryModelName || 'unknown-model'}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Language Selector + Generate/Regenerate Button */}
                      {transcript && (
                        <div className="flex items-center gap-3">
                          <select
                            value={summaryLanguage}
                            onChange={(e) => setSummaryLanguage(e.target.value)}
                            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-bold text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                          >
                            <option value="vi">🇻🇳 Tiếng Việt</option>
                            <option value="en">🇺🇸 English</option>
                            <option value="zh">🇨🇳 中文</option>
                            <option value="ja">🇯🇵 日本語</option>
                            <option value="ko">🇰🇷 한국어</option>
                          </select>
                          <button
                            onClick={() => handleRegenerateAINotes(summaryLanguage)}
                            disabled={isRegenerating}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-black text-white transition hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <RefreshCw size={16} className={isRegenerating ? "animate-spin" : ""} />
                            {isRegenerating ? "Đang tạo AI Notes..." : summaryFailed ? "Thử lại tạo AI Notes" : "Tạo lại AI Notes"}
                          </button>
                        </div>
                      )}

                      {!summary && keyPoints.length === 0 && decisions.length === 0 && actionItems.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center dark:border-slate-700 dark:bg-slate-800/30">
                          <Sparkles size={32} className="mx-auto mb-3 text-gray-300 dark:text-slate-600" />
                          <p className="text-sm font-bold text-gray-500 dark:text-slate-400">
                            {summaryFailed ? 'Transcript da luu, nhung AI Notes chua tao duoc.' : 'Chua co AI Notes cho cuoc hop nay.'}
                          </p>
                        </div>
                      ) : (
                        <>
                          {summary && (
                            <section className="rounded-2xl border border-primary-100 bg-primary-50/30 p-5 dark:border-primary-900/20 dark:bg-primary-900/10">
                              <h4 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-primary-700 dark:text-primary-300">
                                <FileText size={16} />
                                Tom tat
                              </h4>
                              <p className="text-sm leading-7 text-gray-800 dark:text-slate-300">{summary}</p>
                            </section>
                          )}

                          {keyPoints.length > 0 && (
                            <section className="space-y-3">
                              <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-blue-600 dark:text-blue-300">
                                <Key size={16} />
                                Diem chinh
                              </h4>
                              {keyPoints.map((point, index) => (
                                <div key={`${point}-${index}`} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                    {index + 1}
                                  </span>
                                  <p className="text-sm font-medium leading-relaxed text-gray-700 dark:text-slate-300">{point}</p>
                                </div>
                              ))}
                            </section>
                          )}

                          {decisions.length > 0 && (
                            <section className="space-y-3">
                              <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-300">
                                <Target size={16} />
                                Quyet dinh
                              </h4>
                              {decisions.map((decision, index) => (
                                <div key={`${decision}-${index}`} className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 dark:border-emerald-900/20 dark:bg-emerald-900/10">
                                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                  <p className="text-sm font-bold leading-relaxed text-emerald-900 dark:text-emerald-100">{decision}</p>
                                </div>
                              ))}
                            </section>
                          )}

                          {actionItems.length > 0 && (
                            <section className="space-y-3">
                              <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-amber-600 dark:text-amber-300">
                                <CheckCircle2 size={16} />
                                Viec can lam
                              </h4>
                              {actionItems.map((item) => (
                                <div key={item.id} className="rounded-xl border border-gray-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                                  <div className="flex items-start justify-between gap-3">
                                    <p className="text-sm font-bold text-gray-900 dark:text-slate-100">{item.title}</p>
                                    <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                                      {item.status}
                                    </span>
                                  </div>
                                  {item.assigned_email && (
                                    <p className="mt-2 text-xs font-semibold text-gray-500 dark:text-slate-400">{item.assigned_email}</p>
                                  )}
                                </div>
                              ))}
                            </section>
                          )}
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Nguoi tao</h3>
            <p className="mt-3 font-bold text-gray-900 dark:text-slate-100">
              {meeting.createdByUser?.displayName || meeting.createdByUser?.email || 'Khong xac dinh'}
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Ngu canh</h3>
            <div className="mt-3 space-y-2 text-sm text-gray-600 dark:text-slate-300">
              <p>To chuc: {meeting.organization?.name || 'Chua co'}</p>
              <p>Nhom: {meeting.group?.name || 'Nhom chung'}</p>
              <p>Trang thai: {meeting.status}</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default MeetingDetail;
