import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, FileAudio, Mic, ShieldAlert, UploadCloud } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { normalizeFeatureFlags } from '../../services/mappers';
import { useOrgStore } from '../../stores';

const UploadAudio: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrg, groups } = useOrgStore();
  const [selectedGroupId, setSelectedGroupId] = React.useState('');
  const [selectedFileName, setSelectedFileName] = React.useState('');

  const featureQuery = useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const response = await api.get('/api/config/features');
      return normalizeFeatureFlags(response.data);
    },
  });

  const uploadEnabled = featureQuery.data?.uploadEnabled ?? false;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-slate-100">Tải âm thanh</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-400">
            Chuẩn bị ngữ cảnh cuộc họp trước khi gửi file ghi âm vào pipeline AI.
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="rounded-xl border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={18} />
        </button>
      </div>

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
    </div>
  );
};

export default UploadAudio;
