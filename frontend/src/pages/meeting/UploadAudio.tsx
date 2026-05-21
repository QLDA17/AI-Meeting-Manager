import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  FileAudio,
  Loader2,
  Mic,
  ShieldAlert,
  Sparkles,
  Square,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { normalizeFeatureFlags } from '../../services/mappers';
import { useOrgStore } from '../../stores';
import { useLiveTestRecorder } from '../../hooks';

type UploadTab = 'file' | 'live-test';

const STT_PROVIDER_OPTIONS = [
  { value: '', label: 'Default (Deepgram)' },
  { value: 'viwhisper', label: 'ViWhisper (small)' },
  { value: 'phowhisper', label: 'PhoWhisper' },
];

const UploadAudio: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrg, groups } = useOrgStore();
  const [selectedGroupId, setSelectedGroupId] = React.useState('');
  const [selectedFileName, setSelectedFileName] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<UploadTab>('file');
  const [sttProvider, setSttProvider] = React.useState('');

  const liveTest = useLiveTestRecorder(sttProvider || undefined);
  const isViWhisper = sttProvider === 'viwhisper';

  const featureQuery = useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const response = await api.get('/api/config/features');
      return normalizeFeatureFlags(response.data);
    },
  });

  const uploadEnabled = featureQuery.data?.uploadEnabled ?? false;
  const aiNotes = liveTest.aiNotes;
  const actionItems = Array.isArray(aiNotes?.action_items) ? aiNotes.action_items : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-slate-100">Tải âm thanh</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
            Gửi file ghi âm hoặc test nhanh STT/AI trực tiếp từ microphone.
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="rounded-xl border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

      <div className="flex rounded-2xl border border-gray-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <button
          onClick={() => setActiveTab('file')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition ${
            activeTab === 'file'
              ? 'bg-primary-600 text-white shadow'
              : 'text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <UploadCloud size={16} />
          Tải file
        </button>
        <button
          onClick={() => setActiveTab('live-test')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition ${
            activeTab === 'live-test'
              ? 'bg-primary-600 text-white shadow'
              : 'text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800'
          }`}
        >
          <Mic size={16} />
          Thu âm trực tiếp test
        </button>
      </div>

      {activeTab === 'file' && (
        <>
          <div className={`rounded-3xl border p-5 ${uploadEnabled ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/30 dark:bg-emerald-900/10' : 'border-amber-200 bg-amber-50/70 dark:border-amber-900/30 dark:bg-amber-900/10'}`}>
            <div className="flex items-start gap-3">
              {uploadEnabled ? <Mic className="mt-1 text-emerald-600" size={20} /> : <ShieldAlert className="mt-1 text-amber-600" size={20} />}
              <div>
                <p className="font-bold text-gray-900 dark:text-slate-100">
                  {uploadEnabled ? 'Upload pipeline đang khả dụng' : 'Upload pipeline đang tạm tắt'}
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                  {uploadEnabled
                    ? 'Bạn có thể tiếp tục đẩy file ghi âm lên backend để xử lý.'
                    : 'Backend hiện đang khóa upload/job tracking do phụ thuộc xử lý audio chưa ổn định. Luồng tạo cuộc họp và quản lý action items vẫn hoạt động bình thường.'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Ngữ cảnh cuộc họp</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-slate-200">Tổ chức</label>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  {currentOrg?.name || 'Chưa chọn tổ chức'}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-slate-200">Nhóm nhận bản ghi</label>
                <select
                  value={selectedGroupId}
                  onChange={(event) => setSelectedGroupId(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="">Chọn nhóm</option>
                  {groups
                    .filter((group) => group.organization_id === currentOrg?.id)
                    .map((group) => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                </select>
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-slate-200">Tệp âm thanh</label>
              <label className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center transition ${
                uploadEnabled
                  ? 'border-primary-300 bg-primary-50/40 hover:border-primary-500 dark:border-primary-900/40 dark:bg-primary-900/10'
                  : 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 dark:border-slate-700 dark:bg-slate-800/50'
              }`}>
                <input
                  type="file"
                  accept=".wav,.mp3,.m4a,audio/*"
                  className="hidden"
                  disabled={!uploadEnabled}
                  onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name || '')}
                />
                <UploadCloud size={32} className="mb-3" />
                <p className="font-bold">{selectedFileName || 'Chọn file .wav, .mp3 hoặc .m4a'}</p>
                <p className="mt-2 text-sm">Dung lượng tối đa 50MB</p>
              </label>
            </div>

            {!uploadEnabled && (
              <div className="mt-6 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-200">
                <div className="flex items-start gap-2">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Fallback hiện tại</p>
                    <p className="mt-1">
                      Bạn vẫn có thể tạo cuộc họp thủ công ở màn tạo lịch hoặc quản lý action items sau cuộc họp. Khi backend bật lại upload, màn này sẽ dùng trực tiếp endpoint thật mà không cần đổi flow phía người dùng.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => navigate('/meetings/create')}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-700"
              >
                <Mic size={16} />
                Tạo cuộc họp thủ công
              </button>
              <button
                disabled={!uploadEnabled || !selectedGroupId || !selectedFileName}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 transition disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
              >
                <FileAudio size={16} />
                Gửi file lên backend
              </button>
            </div>
          </div>
        </>
      )}

      {activeTab === 'live-test' && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-indigo-200 bg-indigo-50/60 p-5 dark:border-indigo-900/40 dark:bg-indigo-900/10">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-1 text-indigo-600 dark:text-indigo-300" size={20} />
                <div>
                  <p className="font-bold text-gray-900 dark:text-slate-100">Phiên test không lưu database</p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
                    Audio stream gửi lên backend để STT/AI, không tạo meeting hay transcript trong database. Kết quả biến mất khi bạn xóa phiên hoặc rời trang.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-slate-200">STT Engine</label>
                <select
                  value={sttProvider}
                  onChange={(e) => setSttProvider(e.target.value)}
                  disabled={liveTest.isRecording || liveTest.isTranscribing}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-primary-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {STT_PROVIDER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {!liveTest.isRecording ? (
                  <button
                    onClick={liveTest.startRecording}
                    disabled={liveTest.isTranscribing}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {liveTest.isTranscribing ? <Loader2 size={16} className="animate-spin" /> : <Mic size={16} />}
                    {liveTest.isTranscribing ? 'Đang xử lý STT' : 'Bắt đầu thu test'}
                  </button>
                ) : (
                  <button
                    onClick={liveTest.stopRecording}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900"
                  >
                    <Square size={16} />
                    Dừng thu
                  </button>
                )}
                <button
                  onClick={liveTest.analyze}
                  disabled={liveTest.isAnalyzing || liveTest.isTranscribing || (!liveTest.fullTranscript.trim() && !liveTest.interimTranscript.trim())}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-black text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {liveTest.isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Tạo AI Notes
                </button>
                <button
                  onClick={liveTest.reset}
                  disabled={liveTest.isTranscribing}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Trash2 size={16} />
                  Xóa phiên test
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-slate-800">
                  <p className="text-xs font-bold uppercase text-gray-500">Microphone</p>
                  <p className="mt-1 font-black text-gray-900 dark:text-slate-100">{liveTest.isTranscribing ? 'Đang xử lý' : liveTest.isRecording ? 'Đang thu' : 'Đang dừng'}</p>
                  <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-slate-400">{liveTest.sttStatus}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-slate-800">
                  <p className="text-xs font-bold uppercase text-gray-500">STT Engine</p>
                  <p className="mt-1 font-black text-gray-900 dark:text-slate-100">{STT_PROVIDER_OPTIONS.find(o => o.value === sttProvider)?.label || 'Default'}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-slate-800">
                  <p className="text-xs font-bold uppercase text-gray-500">STT chunks</p>
                  <p className="mt-1 font-black text-gray-900 dark:text-slate-100">{liveTest.chunks.length}</p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-slate-800">
                  <p className="text-xs font-bold uppercase text-gray-500">AI Notes</p>
                  <p className="mt-1 font-black text-gray-900 dark:text-slate-100">{liveTest.summaryStatus || 'Chưa tạo'}</p>
                </div>
              </div>

              {liveTest.error && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
                  {liveTest.error}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Transcript test</h2>
                <span className="text-xs font-bold uppercase text-gray-400">{isViWhisper ? 'Deferred chunks' : 'Realtime chunks'}</span>
              </div>
              <div className="mt-5 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {liveTest.interimTranscript && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/20">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                        Interim
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-100">{liveTest.interimTranscript}</p>
                  </div>
                )}
                {liveTest.chunks.length === 0 && !liveTest.interimTranscript ? (
                  <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500 dark:border-slate-700 dark:text-slate-400">
                    Bấm bắt đầu thu, nói vài câu, transcript sẽ hiện ở đây.
                  </div>
                ) : liveTest.chunks.map((chunk) => (
                  <div key={chunk.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-800/70">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-black text-primary-700 dark:bg-primary-900/30 dark:text-primary-200">
                        Chunk {chunk.chunkIndex + 1}
                      </span>
                      <span className="text-[10px] font-bold uppercase text-gray-400">{chunk.language}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-800 dark:text-slate-200">{chunk.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">AI Notes test</h2>
              {!aiNotes ? (
                <p className="mt-4 rounded-2xl border border-dashed border-gray-200 p-6 text-sm text-gray-500 dark:border-slate-700 dark:text-slate-400">
                  Sau khi có transcript, bấm “Tạo AI Notes” để sinh tóm tắt ngay trên màn hình.
                </p>
              ) : (
                <div className="mt-4 space-y-5">
                  {aiNotes.meeting_summary && (
                    <div>
                      <p className="text-xs font-black uppercase text-gray-400">Tóm tắt</p>
                      <p className="mt-2 text-sm leading-relaxed text-gray-800 dark:text-slate-200">{aiNotes.meeting_summary}</p>
                    </div>
                  )}
                  {Array.isArray(aiNotes.key_points) && aiNotes.key_points.length > 0 && (
                    <div>
                      <p className="text-xs font-black uppercase text-gray-400">Ý chính</p>
                      <ul className="mt-2 space-y-2 text-sm text-gray-800 dark:text-slate-200">
                        {aiNotes.key_points.map((item, index) => <li key={index}>• {item}</li>)}
                      </ul>
                    </div>
                  )}
                  {actionItems.length > 0 && (
                    <div>
                      <p className="text-xs font-black uppercase text-gray-400">Việc cần làm</p>
                      <div className="mt-2 space-y-2">
                        {actionItems.map((item, index) => (
                          <div key={index} className="rounded-xl bg-gray-50 p-3 text-sm dark:bg-slate-800">
                            <p className="font-bold text-gray-900 dark:text-slate-100">{item.task}</p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                              {item.owner || 'Chưa rõ người phụ trách'} {item.deadline ? `• ${item.deadline}` : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {liveTest.nlpMetadata && (
              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">PhoBERT metadata</h2>
                <pre className="mt-4 max-h-72 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
                  {JSON.stringify(liveTest.nlpMetadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadAudio;
