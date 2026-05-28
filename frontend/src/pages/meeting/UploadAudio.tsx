import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Mic,
  RefreshCcw,
  Sparkles,
  Square,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { normalizeFeatureFlags } from '../../services/mappers';
import { useOrgStore } from '../../stores';
import { useLiveTestRecorder } from '../../hooks';
import type { UploadJobStatus } from '../../types';
import { Button } from '../../components/ui';


type UploadTab = 'file' | 'live-test';

const STT_PROVIDER_OPTIONS = [
  { value: 'deepgram', label: 'Deepgram (Recommended)' },
  { value: 'viwhisper', label: 'ViWhisper' },
];

const LANGUAGE_OPTIONS = [
  { value: 'auto', label: 'Auto detect' },
  { value: 'vi', label: 'Vietnamese' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ko', label: 'Korean' },
];

const STAGE_LABELS: Record<string, string> = {
  uploading: 'Đang tải file lên backend',
  queued: 'Đang chờ vào hàng',
  uploaded: 'Đã nhận file',
  normalized: 'Chuẩn hóa audio',
  noise_cleanup: 'Lọc nhiễu',
  chunking: 'Tách chunk xử lý',
  transcribing: 'Đang nhận dạng giọng nói',
  merging_transcript: 'Đang ghép transcript',
  diarizing: 'Đang tách người nói',
  phobert_processing: 'Đang tối ưu PhoBERT',
  bartpho_processing: 'Đang tối ưu BARTpho',
  post_processing: 'Đang hậu xử lý transcript',
  summarizing: 'Đang tạo summary và action items',
  completed: 'Hoàn tất',
  failed: 'Thất bại',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Chưa gửi',
  queued: 'Đang chờ',
  processing: 'Đang xử lý',
  completed: 'Hoàn tất',
  failed: 'Lỗi',
  completed_with_errors: 'Hoàn tất có lỗi',
};
const UPLOAD_UI_STAGE_LABEL = 'Đang tải file lên backend';
const MAX_PARALLEL_UPLOADS = 3;

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

const formatDuration = (seconds: number | null) => {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return 'Chưa đọc được thời lượng';
  const totalSeconds = Math.round(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
};

type UploadItemStatus = 'draft' | UploadJobStatus['status'];
type UploadRequestState = 'idle' | 'uploading' | 'uploaded' | 'failed';

interface UploadAudioItem {
  clientId: string;
  file: File;
  objectUrl: string;
  title: string;
  groupId: string;
  language: string;
  sttProvider: string;
  estimatedDurationSeconds: number | null;
  sourceLabel: string;
  previewStatus: 'ready' | 'reading' | 'error';
  jobId?: string;
  meetingId?: string;
  status: UploadItemStatus;
  currentStage?: string;
  progressPercent?: number;
  errorMessage?: string;
  uploadProgress?: number;
  uploadState?: UploadRequestState;
  uploadError?: string;
}

interface TrackedUploadItem {
  clientId: string;
  title: string;
  sourceLabel: string;
  jobId?: string;
  meetingId?: string;
  status: UploadItemStatus;
  currentStage?: string;
  progressPercent?: number;
  errorMessage?: string;
}

interface PersistedUploadTracker {
  batchId: string;
  orgId: string;
  userId: string;
  savedAt: string;
  items: TrackedUploadItem[];
}

const makeClientId = () => `upload_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;

const runWithConcurrency = async <T,>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
) => {
  let nextIndex = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      await worker(items[currentIndex]);
    }
  });
  await Promise.all(runners);
};

const readAudioDuration = (objectUrl: string): Promise<number | null> =>
  new Promise((resolve) => {
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.src = objectUrl;
    audio.onloadedmetadata = () => resolve(Number.isFinite(audio.duration) ? audio.duration : null);
    audio.onerror = () => resolve(null);
  });

const UploadAudio: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrg, groups } = useOrgStore();
  const [activeTab, setActiveTab] = React.useState<UploadTab>('file');
  const [selectedGroupId, setSelectedGroupId] = React.useState('');
  const [uploadItems, setUploadItems] = React.useState<UploadAudioItem[]>([]);
  const [trackedItems, setTrackedItems] = React.useState<TrackedUploadItem[]>([]);
  const [language, setLanguage] = React.useState('auto');
  const [uploadDefaultProvider, setUploadDefaultProvider] = React.useState('deepgram');
  const [sttProvider, setSttProvider] = React.useState('deepgram');
  const [currentBatchId, setCurrentBatchId] = React.useState('');
  const [isRestoringTracker, setIsRestoringTracker] = React.useState(false);
  const [restoredTracker, setRestoredTracker] = React.useState(false);
  const [trackerWarning, setTrackerWarning] = React.useState('');
  const uploadItemsRef = React.useRef<UploadAudioItem[]>([]);
  const trackingStorageKey = React.useMemo(() => {
    if (!currentOrg?.id || !user?.id) return '';
    return `upload-tracker:${user.id}:${currentOrg.id}`;
  }, [currentOrg?.id, user?.id]);

  const liveTest = useLiveTestRecorder(sttProvider === 'deepgram' ? undefined : sttProvider);
  const isViWhisper = sttProvider === 'viwhisper';
  const aiNotes = liveTest.aiNotes;
  const actionItems = Array.isArray(aiNotes?.action_items) ? aiNotes.action_items : [];

  React.useEffect(() => {
    if (!currentOrg?.id) return;
    if (selectedGroupId) return;
    const orgGroups = groups.filter((group) => group.organization_id === currentOrg.id);
    if (orgGroups[0]?.id) {
      setSelectedGroupId(orgGroups[0].id);
    }
  }, [currentOrg?.id, groups, selectedGroupId]);

  React.useEffect(() => {
    uploadItemsRef.current = uploadItems;
  }, [uploadItems]);

  React.useEffect(() => {
    return () => {
      uploadItemsRef.current.forEach((item) => URL.revokeObjectURL(item.objectUrl));
    };
  }, []);

  const featureQuery = useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const response = await api.get('/api/config/features');
      return normalizeFeatureFlags(response.data);
    },
  });

  const uploadEnabled = featureQuery.data?.uploadEnabled ?? false;
  const jobTrackingEnabled = featureQuery.data?.jobTrackingEnabled ?? false;

  const clearStoredTracker = React.useCallback(() => {
    if (trackingStorageKey) {
      localStorage.removeItem(trackingStorageKey);
    }
  }, [trackingStorageKey]);

  const persistTrackedBatch = React.useCallback((batchId: string, items: TrackedUploadItem[]) => {
    if (!trackingStorageKey || !currentOrg?.id || !user?.id || !batchId || items.length === 0) return;
    const payload: PersistedUploadTracker = {
      batchId,
      orgId: currentOrg.id,
      userId: user.id,
      savedAt: new Date().toISOString(),
      items,
    };
    localStorage.setItem(trackingStorageKey, JSON.stringify(payload));
  }, [currentOrg?.id, trackingStorageKey, user?.id]);

  const dismissTrackedBatch = React.useCallback(() => {
    setCurrentBatchId('');
    setTrackedItems([]);
    setIsRestoringTracker(false);
    setRestoredTracker(false);
    setTrackerWarning('');
    clearStoredTracker();
  }, [clearStoredTracker]);

  const applyJobStatuses = React.useCallback((statuses: UploadJobStatus[]) => {
    const statusMap = new Map(statuses.map((item) => [item.job_id, item]));
    setUploadItems((current) =>
      current.map((item) => {
        const next = item.jobId ? statusMap.get(item.jobId) : undefined;
        if (!next) return item;
        return {
          ...item,
          status: next.status,
          currentStage: next.current_stage,
          progressPercent: next.progress_percent,
          errorMessage: next.error_message,
          uploadState: item.uploadState === 'failed' ? item.uploadState : 'uploaded',
        };
      }),
    );
    setTrackedItems((current) => {
      const trackedByJobId = new Map(current.map((item) => [item.jobId, item]));
      return current.map((trackedItem) => {
        const statusItem = trackedItem.jobId ? statusMap.get(trackedItem.jobId) : undefined;
        if (!statusItem) {
          return trackedItem;
        }
        const existingTracked = trackedByJobId.get(statusItem.job_id);
        const existingDraft = uploadItemsRef.current.find((item) => item.jobId === statusItem.job_id);
        return {
          clientId: existingTracked?.clientId || existingDraft?.clientId || trackedItem.clientId,
          title: existingTracked?.title || existingDraft?.title || trackedItem.title,
          sourceLabel: existingTracked?.sourceLabel || existingDraft?.sourceLabel || trackedItem.sourceLabel,
          jobId: statusItem.job_id,
          meetingId: statusItem.meeting_id,
          status: statusItem.status,
          currentStage: statusItem.current_stage,
          progressPercent: statusItem.progress_percent,
          errorMessage: statusItem.error_message,
        } satisfies TrackedUploadItem;
      });
    });
  }, []);

  React.useEffect(() => {
    if (!trackingStorageKey || currentBatchId || trackedItems.length > 0) return;
    const raw = localStorage.getItem(trackingStorageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as PersistedUploadTracker;
      if (!parsed?.batchId || !Array.isArray(parsed.items) || parsed.items.length === 0) {
        localStorage.removeItem(trackingStorageKey);
        return;
      }
      setCurrentBatchId(parsed.batchId);
      setTrackedItems(parsed.items);
      setRestoredTracker(true);
      setIsRestoringTracker(true);
      setTrackerWarning('');
    } catch {
      localStorage.removeItem(trackingStorageKey);
    }
  }, [currentBatchId, trackedItems.length, trackingStorageKey]);

  React.useEffect(() => {
    if (currentBatchId && trackedItems.length > 0) {
      persistTrackedBatch(currentBatchId, trackedItems);
    }
  }, [currentBatchId, persistTrackedBatch, trackedItems]);

  const trackedJobIds = React.useMemo(
    () => trackedItems.map((item) => item.jobId).filter((jobId): jobId is string => Boolean(jobId)),
    [trackedItems],
  );

  const jobsStatusQuery = useQuery({
    queryKey: ['upload-jobs', trackedJobIds],
    enabled: trackedJobIds.length > 0 && jobTrackingEnabled,
    queryFn: async () => {
      return Promise.allSettled(
        trackedJobIds.map(async (jobId) => {
          const response = await api.get<UploadJobStatus>(`/api/upload/jobs/${jobId}`);
          return response.data;
        }),
      );
    },
    refetchInterval: (query) => {
      const hasActiveJobs = trackedItems.some((item) => item.status === 'queued' || item.status === 'processing');
      if (hasActiveJobs) return 1500;
      return false;
    },
  });

  React.useEffect(() => {
    const data = jobsStatusQuery.data;
    if (!data) return;
    const fulfilled = data
      .filter((entry): entry is PromiseFulfilledResult<UploadJobStatus> => entry.status === 'fulfilled')
      .map((entry) => entry.value);
    const rejectedCount = data.length - fulfilled.length;
    if (fulfilled.length > 0) {
      applyJobStatuses(fulfilled);
      setIsRestoringTracker(false);
      setTrackerWarning(
        rejectedCount > 0
          ? 'Một số job không còn live tracking, nhưng các meeting đã tạo vẫn có thể tiếp tục xử lý ở backend.'
          : '',
      );
    } else if (rejectedCount > 0 && currentBatchId) {
      setIsRestoringTracker(false);
      setTrackerWarning(
        'Không thể khôi phục theo dõi tiến độ trực tiếp. Backend không còn giữ các job này trong bộ nhớ, nhưng meeting liên quan vẫn có thể tiếp tục xử lý.',
      );
    }
  }, [applyJobStatuses, currentBatchId, jobsStatusQuery.data]);

  const uploadMutation = useMutation({
    mutationFn: async (clientIds?: string[]) => {
      if (!currentOrg?.id) {
        throw new Error('Chưa có tổ chức để gắn meeting upload.');
      }
      const eligibleItems = uploadItemsRef.current.filter((item) => {
        if (clientIds?.length) {
          return clientIds.includes(item.clientId);
        }
        return !item.jobId && (item.status === 'draft' || item.uploadState === 'failed' || item.uploadState == null);
      });
      if (eligibleItems.length === 0) {
        throw new Error('Vui lòng chọn ít nhất một file âm thanh.');
      }
      const uploadedAt = new Date();
      const trackerId = currentBatchId || `tracker_${Date.now()}`;
      setCurrentBatchId(trackerId);
      setTrackerWarning('');

      const successes: Array<{ clientId: string; sourceLabel: string; title: string; data: UploadJobStatus }> = [];
      await runWithConcurrency(eligibleItems, MAX_PARALLEL_UPLOADS, async (item) => {
        setUploadItems((current) => current.map((entry) => (
          entry.clientId === item.clientId
            ? { ...entry, uploadState: 'uploading', uploadProgress: 0, uploadError: '', errorMessage: '' }
            : entry
        )));

        const estimatedEnd = item.estimatedDurationSeconds
          ? new Date(uploadedAt.getTime() + item.estimatedDurationSeconds * 1000)
          : uploadedAt;
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('organization_id', currentOrg.id);
        formData.append('title', item.title.trim() || item.file.name.replace(/\.[^/.]+$/, ''));
        formData.append('language', item.language);
        formData.append('stt_provider', item.sttProvider);
        formData.append('scheduled_start', uploadedAt.toISOString());
        formData.append('scheduled_end', estimatedEnd.toISOString());
        formData.append('enable_diarization', 'true');
        formData.append('enable_summary', 'true');
        formData.append('enable_action_items', 'true');
        formData.append('enable_noise_cleanup', 'true');
        if (item.groupId) {
          formData.append('group_id', item.groupId);
        }

        try {
          const response = await api.post<UploadJobStatus>('/api/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000,
            onUploadProgress: (event) => {
              const total = event.total || item.file.size || 0;
              const progress = total > 0 ? Math.min(100, Math.round((event.loaded / total) * 100)) : 0;
              setUploadItems((current) => current.map((entry) => (
                entry.clientId === item.clientId ? { ...entry, uploadProgress: progress, uploadState: 'uploading' } : entry
              )));
            },
          });
          successes.push({
            clientId: item.clientId,
            sourceLabel: item.sourceLabel,
            title: item.title,
            data: response.data,
          });
          setUploadItems((current) => current.map((entry) => (
            entry.clientId === item.clientId
              ? {
                  ...entry,
                  jobId: response.data.job_id,
                  meetingId: response.data.meeting_id,
                  status: response.data.status,
                  currentStage: response.data.current_stage,
                  progressPercent: response.data.progress_percent,
                  uploadProgress: 100,
                  uploadState: 'uploaded',
                  uploadError: '',
                }
              : entry
          )));
        } catch (error: any) {
          const message = error?.response?.data?.detail || error?.message || 'Upload that bai';
          setUploadItems((current) => current.map((entry) => (
            entry.clientId === item.clientId
              ? { ...entry, uploadState: 'failed', uploadError: message, uploadProgress: 0 }
              : entry
          )));
        }
      });

      return { trackerId, successes };
    },
    onSuccess: ({ trackerId, successes }) => {
      if (successes.length === 0) {
        return;
      }
      setCurrentBatchId(trackerId);
      setTrackedItems((current) => {
        const byClientId = new Map(current.map((item) => [item.clientId, item]));
        successes.forEach(({ clientId, sourceLabel, title, data }) => {
          byClientId.set(clientId, {
            clientId,
            title: title || sourceLabel,
            sourceLabel,
            jobId: data.job_id,
            meetingId: data.meeting_id,
            status: data.status,
            currentStage: data.current_stage,
            progressPercent: data.progress_percent,
            errorMessage: data.error_message,
          });
        });
        return Array.from(byClientId.values());
      });
      setRestoredTracker(false);
      setIsRestoringTracker(false);
      setTrackerWarning('');
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await api.post<UploadJobStatus>(`/api/upload/jobs/${jobId}/retry`);
      return response.data;
    },
    onSuccess: (data) => {
      setUploadItems((current) =>
        current.map((item) =>
          item.jobId === data.job_id || item.meetingId === data.meeting_id
            ? {
                ...item,
                jobId: data.job_id,
                meetingId: data.meeting_id,
                status: data.status,
                currentStage: data.current_stage,
                progressPercent: data.progress_percent,
                errorMessage: data.error_message,
              }
            : item,
        ),
      );
      setTrackedItems((current) =>
        current.map((item) =>
          item.jobId === data.job_id || item.meetingId === data.meeting_id
            ? {
                ...item,
                jobId: data.job_id,
                meetingId: data.meeting_id,
                status: data.status,
                currentStage: data.current_stage,
                progressPercent: data.progress_percent,
                errorMessage: data.error_message,
              }
            : item,
        ),
      );
      setTrackerWarning('');
    },
  });

  const handleFilesSelected = React.useCallback(async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList);
    const baseGroupId = selectedGroupId;
    const baseLanguage = language;
    const baseProvider = uploadDefaultProvider;
    const nextItems = await Promise.all(files.map(async (file) => {
      const objectUrl = URL.createObjectURL(file);
      const duration = await readAudioDuration(objectUrl);
      return {
        clientId: makeClientId(),
        file,
        objectUrl,
        title: file.name.replace(/\.[^/.]+$/, ''),
        groupId: baseGroupId,
        language: baseLanguage,
        sttProvider: baseProvider,
        estimatedDurationSeconds: duration,
        sourceLabel: file.name,
        previewStatus: (duration == null ? 'error' : 'ready') as UploadAudioItem['previewStatus'],
        status: 'draft' as const,
      };
    }));
    setUploadItems((current) => [...current, ...nextItems]);
  }, [language, selectedGroupId, uploadDefaultProvider]);

  const removeUploadItem = React.useCallback((clientId: string) => {
    setUploadItems((current) => {
      const target = current.find((item) => item.clientId === clientId);
      if (target) {
        URL.revokeObjectURL(target.objectUrl);
      }
      return current.filter((item) => item.clientId !== clientId);
    });
  }, []);

  const updateUploadItem = React.useCallback((clientId: string, updates: Partial<UploadAudioItem>) => {
    setUploadItems((current) => current.map((item) => (
      item.clientId === clientId ? { ...item, ...updates } : item
    )));
  }, []);

  const clearBatch = React.useCallback(() => {
    setUploadItems((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.objectUrl));
      return [];
    });
  }, []);

  const uploadError = uploadMutation.error instanceof Error ? uploadMutation.error.message : '';
  const retryError = retryMutation.error instanceof Error ? retryMutation.error.message : '';
  const isUploading = uploadMutation.isPending;
  const orgGroups = groups.filter((group) => group.organization_id === currentOrg?.id);
  const inFlightUploadItems: TrackedUploadItem[] = uploadItems
    .filter((item) => (item.uploadState === 'uploading' || item.uploadState === 'failed') && !item.jobId)
    .map((item) => ({
      clientId: item.clientId,
      title: item.title,
      sourceLabel: item.sourceLabel,
      status: item.uploadState === 'failed' ? 'failed' : 'draft',
      currentStage: item.uploadState === 'uploading' ? 'uploading' : 'failed',
      progressPercent: item.uploadProgress ?? 0,
      errorMessage: item.uploadError,
    }));
  const displayTrackedItems = [
    ...trackedItems,
    ...inFlightUploadItems.filter((uploadItem) => !trackedItems.some((tracked) => tracked.clientId === uploadItem.clientId)),
  ];
  const trackedItemCount = displayTrackedItems.length;
  const completedTrackedCount = displayTrackedItems.filter((item) => item.status === 'completed').length;
  const failedTrackedCount = displayTrackedItems.filter((item) => item.status === 'failed').length;
  const queuedTrackedCount = displayTrackedItems.filter((item) => item.status === 'queued').length;
  const processingTrackedCount = displayTrackedItems.filter((item) => item.status === 'processing').length;
  const isTrackedBatchTerminal = trackedItemCount > 0 && displayTrackedItems.every(
    (item) => item.status === 'completed' || item.status === 'failed' || item.status === 'draft',
  );
  const aggregateTrackerStatus = failedTrackedCount > 0 && completedTrackedCount + failedTrackedCount === trackedItemCount
    ? 'completed_with_errors'
    : completedTrackedCount === trackedItemCount && trackedItemCount > 0
      ? 'completed'
      : processingTrackedCount > 0 || isUploading
        ? 'processing'
        : queuedTrackedCount > 0
          ? 'queued'
          : 'draft';
  const batchProgressPercent = trackedItemCount > 0
    ? Math.round(
      displayTrackedItems.reduce((sum, item) => sum + (item.progressPercent ?? (item.status === 'draft' ? 0 : 5)), 0) / trackedItemCount,
    )
    : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Dynamic Keyframes Animation Injection */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes soundwave {
          0% { transform: scaleY(0.4); opacity: 0.6; }
          100% { transform: scaleY(1.15); opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          background-size: 200% auto;
          animation: shimmer 1.8s linear infinite;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      ` }} />

      <div className="flex flex-col gap-4 pb-5 border-b border-gray-150/60 dark:border-slate-800/80 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary-700 dark:bg-primary-950/20 dark:text-primary-300 mb-2">
            <Sparkles size={12} className="text-primary-500" />
            AI Transcription Engine
          </div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-slate-100">Tải lên & Khởi tạo Meeting</h1>
          <p className="mt-1.5 text-xs text-gray-400 dark:text-slate-550 max-w-2xl leading-relaxed">
            Hệ thống hỗ trợ tải lên tệp tin âm thanh hậu kỳ hoặc ghi âm live test. Trí tuệ nhân tạo sẽ tự động phân tích và tạo biên bản cuộc họp hoàn chỉnh chỉ trong vài phút.
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="self-start sm:self-center flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-450 dark:hover:bg-slate-800 dark:hover:text-slate-200 shadow-sm"
        >
          <ArrowLeft size={16} className="stroke-[2.5]" />
        </button>
      </div>

      <div className="flex rounded-2xl border border-gray-150/65 bg-gray-50/50 p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950/40 backdrop-blur-md">
        <button
          onClick={() => setActiveTab('file')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300 ${
            activeTab === 'file'
              ? 'bg-slate-900 text-white shadow-lg dark:bg-slate-100 dark:text-slate-900'
              : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <UploadCloud size={16} className={activeTab === 'file' ? 'stroke-[2.5]' : ''} />
          Tải tệp lưu trữ (Backup Upload)
        </button>
        <button
          onClick={() => setActiveTab('live-test')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all duration-300 ${
            activeTab === 'live-test'
              ? 'bg-slate-900 text-white shadow-lg dark:bg-slate-100 dark:text-slate-900'
              : 'text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Mic size={16} className={activeTab === 'live-test' ? 'stroke-[2.5]' : ''} />
          Thu âm trực tiếp (Live Test Mode)
        </button>
      </div>

      {activeTab === 'file' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-150/40 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="pb-4 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
                <UploadCloud size={18} className="text-primary-500" />
                <div>
                  <h2 className="text-base font-black text-gray-900 dark:text-slate-100">Tải file audio thành meeting</h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    Mỗi file là một meeting riêng, có metadata và preview độc lập.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-gray-150 bg-gray-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/20">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">Tổ chức</p>
                  <p className="mt-1.5 text-sm font-bold text-gray-800 dark:text-slate-200">{currentOrg?.name || 'Chưa chọn tổ chức'}</p>
                </div>
                <div className="rounded-2xl border border-gray-150 bg-gray-50/70 p-4 dark:border-slate-800/80 dark:bg-slate-950/20">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">Batch hiện tại</p>
                  <p className="mt-1.5 text-sm font-bold text-gray-800 dark:text-slate-200">
                    {trackedItemCount || uploadItems.length} file · {completedTrackedCount} xong · {failedTrackedCount} lỗi
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">Chọn file audio</label>
                <label className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed p-8 text-center transition-all duration-300 relative overflow-hidden group ${
                  uploadEnabled
                    ? 'border-primary-300 bg-primary-50/15 hover:border-primary-400 hover:bg-primary-50/25 dark:border-primary-900/30 dark:bg-primary-950/5 dark:hover:border-primary-800 dark:hover:bg-primary-950/10'
                    : 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 dark:border-slate-800 dark:bg-slate-800/50'
                }`}>
                  <input
                    type="file"
                    multiple
                    accept=".wav,.mp3,.m4a,.mp4,.webm,.ogg,.flac,audio/*"
                    className="hidden"
                    disabled={!uploadEnabled}
                    onChange={(event) => {
                      void handleFilesSelected(event.target.files);
                      event.target.value = '';
                    }}
                  />
                  <div className="space-y-2 flex flex-col items-center z-10">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-gray-400 dark:bg-slate-800/40 dark:text-slate-500 group-hover:scale-110 transition-transform">
                      <UploadCloud size={24} className="stroke-[1.8]" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-gray-700 dark:text-slate-350">Chọn nhiều file .wav, .mp3, .m4a, .mp4, .webm</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 leading-relaxed">Mỗi file sẽ thành một meeting riêng, có preview và metadata chỉnh riêng.</p>
                    </div>
                  </div>
                </label>
              </div>

              <div className="mt-6 rounded-3xl border border-gray-150/50 bg-gradient-to-br from-white/80 to-primary-50/5 p-5 dark:border-slate-800/80 dark:bg-slate-900/45 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-primary-500" />
                  Danh sách file chờ upload
                </h3>
                <p className="text-[11px] text-gray-400 dark:text-slate-550 mt-0.5">Mỗi file có title, nhóm, ngôn ngữ, engine riêng và nghe thử trước khi gửi.</p>
                <div className="mt-4 space-y-4">
                  {uploadItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-xs font-semibold text-gray-500 dark:border-slate-800 dark:text-slate-400">
                      Chưa có file nào trong batch.
                    </div>
                  ) : (
                    <>
                      {uploadItems.map((item, index) => (
                        <div key={item.clientId} className="rounded-3xl border border-gray-150/60 bg-gray-50/30 p-4 dark:border-slate-800 dark:bg-slate-950/20">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-black text-gray-900 dark:text-slate-100 break-all">{item.sourceLabel}</p>
                                <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-gray-500 dark:bg-slate-900 dark:text-slate-400">
                                  File {index + 1}
                                </span>
                              </div>
                              <p className="mt-1 text-[11px] font-semibold text-gray-500 dark:text-slate-400">{formatBytes(item.file.size)} · {formatDuration(item.estimatedDurationSeconds)}</p>
                            </div>
                            <button
                              onClick={() => removeUploadItem(item.clientId)}
                              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 transition hover:text-red-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                              <div className="space-y-1.5 text-sm">
                                <span className="block font-bold text-xs uppercase tracking-wider text-gray-400 dark:text-slate-500">Tiêu đề cuộc họp</span>
                                <input
                                  value={item.title}
                                  onChange={(event) => updateUploadItem(item.clientId, { title: event.target.value })}
                                  className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 dark:border-slate-750 dark:bg-slate-950 dark:text-slate-100"
                                />
                              </div>
                              <div className="space-y-1.5 text-sm">
                                <span className="block font-bold text-xs uppercase tracking-wider text-gray-400 dark:text-slate-500">Nhóm nhận meeting</span>
                                <select
                                  value={item.groupId}
                                  onChange={(event) => updateUploadItem(item.clientId, { groupId: event.target.value })}
                                  className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 dark:border-slate-750 dark:bg-slate-950 dark:text-slate-100"
                                >
                                  <option value="">Chọn nhóm nhận biên bản...</option>
                                  {orgGroups.map((group) => (
                                    <option key={group.id} value={group.id}>{group.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1.5 text-sm">
                                <span className="block font-bold text-xs uppercase tracking-wider text-gray-400 dark:text-slate-500">Ngôn ngữ đàm thoại</span>
                                <select
                                  value={item.language}
                                  onChange={(event) => updateUploadItem(item.clientId, { language: event.target.value })}
                                  className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 dark:border-slate-750 dark:bg-slate-950 dark:text-slate-100"
                                >
                                  {LANGUAGE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1.5 text-sm">
                                <span className="block font-bold text-xs uppercase tracking-wider text-gray-400 dark:text-slate-500">STT engine</span>
                                <select
                                  value={item.sttProvider}
                                  onChange={(event) => updateUploadItem(item.clientId, { sttProvider: event.target.value })}
                                  className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-3.5 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 dark:border-slate-750 dark:bg-slate-950 dark:text-slate-100"
                                >
                                  {STT_PROVIDER_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                              </div>
                          </div>

                          <div className="mt-4 rounded-2xl border border-gray-150/60 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">Nghe thử trước khi upload</p>
                              <audio controls preload="metadata" src={item.objectUrl} className="mt-3 w-full" />
                              <p className="mt-2 text-[11px] font-semibold text-gray-500 dark:text-slate-400">
                                {item.previewStatus === 'error' ? 'Không đọc được metadata thời lượng, nhưng vẫn có thể upload.' : 'Preview sẵn sàng.'}
                              </p>
                              {(item.uploadState === 'uploading' || item.uploadState === 'failed' || item.uploadState === 'uploaded') && (
                                <div className="mt-3">
                                  <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-800">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${
                                        item.uploadState === 'failed'
                                          ? 'bg-gradient-to-r from-red-500 to-red-600'
                                          : 'bg-gradient-to-r from-sky-400 to-primary-500'
                                      }`}
                                      style={{ width: `${item.uploadProgress ?? (item.uploadState === 'uploaded' ? 100 : 0)}%` }}
                                    />
                                  </div>
                                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                                    <span>
                                      {item.uploadState === 'uploading'
                                        ? UPLOAD_UI_STAGE_LABEL
                                        : item.uploadState === 'uploaded'
                                          ? 'Upload xong, backend đang xử lý'
                                          : 'Upload thất bại'}
                                    </span>
                                    <span>{item.uploadProgress ?? (item.uploadState === 'uploaded' ? 100 : 0)}%</span>
                                  </div>
                                </div>
                              )}
                              {item.uploadError && (
                                <p className="mt-3 text-[11px] font-semibold text-red-600 dark:text-red-400">{item.uploadError}</p>
                              )}
                          </div>
                          {item.uploadState === 'failed' && (
                            <div className="mt-3 flex justify-end">
                              <Button
                                variant="secondary"
                                onClick={() => uploadMutation.mutate([item.clientId])}
                                disabled={isUploading}
                                className="h-9 rounded-2xl px-4 text-[10px] font-bold uppercase tracking-wider"
                              >
                                Retry upload file này
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {uploadError && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300">
                  {uploadError}
                </div>
              )}
              {retryError && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300">
                  {retryError}
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  onClick={() => uploadMutation.mutate(undefined)}
                  disabled={!uploadEnabled || !currentOrg?.id || uploadItems.length === 0 || isUploading}
                  isLoading={isUploading}
                  className="h-11 px-6 rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-primary-600/15"
                >
                  {!isUploading && <UploadCloud size={14} className="stroke-[2.5]" />}
                  {isUploading ? 'Đang gửi từng file...' : 'Bắt đầu upload từng file'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={clearBatch}
                  disabled={uploadItems.length === 0}
                  className="h-11 px-5 rounded-2xl text-xs font-bold uppercase tracking-wider"
                >
                  Xóa batch
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 transition-all">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
                <h2 className="text-xs font-black text-gray-900 dark:text-slate-100 uppercase tracking-widest">Tiến độ xử lý AI</h2>
                {(aggregateTrackerStatus === 'completed' || isTrackedBatchTerminal) && (
                  <span className="rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400">
                    Batch done
                  </span>
                )}
              </div>

              {!currentBatchId && trackedItemCount === 0 && uploadItems.length === 0 ? (
                <div className="mt-5 flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-250 p-6 text-center dark:border-slate-850 bg-gray-50/20 dark:bg-slate-950/10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-400 dark:bg-slate-900/60 dark:text-slate-600">
                    <Loader2 size={18} className="stroke-[1.8] text-gray-300 animate-spin" />
                  </div>
                  <p className="mt-3 text-xs font-bold text-gray-500 dark:text-slate-400">Chưa có job xử lý</p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 max-w-[200px] leading-relaxed mx-auto">
                    Sau khi gửi file thành công, tiến trình lọc nhiễu, tách giọng nói và tóm tắt AI thời gian thực sẽ hiển thị ở đây.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-5">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 text-xs font-semibold text-blue-700 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-300">
                    {isRestoringTracker
                      ? 'Đang khôi phục tiến độ batch đã gửi trước đó. Xử lý AI vẫn tiếp tục ở backend ngay cả khi bạn rời khỏi trang này.'
                      : restoredTracker
                        ? 'Đây là batch đang được theo dõi lại sau khi bạn quay lại trang hoặc reload.'
                        : 'Mỗi file được upload riêng, nhưng backend vẫn tiếp tục xử lý AI ngay cả khi bạn chuyển sang chức năng khác.'}
                  </div>

                  <div className="rounded-2xl bg-gray-50/50 border border-gray-150 p-4 dark:bg-slate-950/25 dark:border-slate-850 shadow-inner">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-550">Giai đoạn hiện tại</p>
                    <p className="mt-1 text-sm font-black text-gray-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-primary-500 animate-ping" />
                      {trackerWarning
                        ? 'Không còn live tracking cho batch này'
                        : aggregateTrackerStatus === 'completed_with_errors'
                          ? 'Batch hoàn tất nhưng có file lỗi'
                          : aggregateTrackerStatus === 'completed' || isTrackedBatchTerminal
                            ? 'Toàn bộ batch đã hoàn tất'
                            : restoredTracker
                              ? 'Đang theo dõi lại batch nhiều file'
                              : isUploading && trackedItemCount === 0
                                ? 'Đang tải file lên backend'
                                : 'Đang xử lý batch nhiều file'}
                    </p>
                    
                    {/* Glowing progress bar with shimmer effect */}
                    <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-800 border border-gray-100/10">
                      <div
                        className={`h-full rounded-full transition-all duration-500 animate-shimmer bg-gradient-to-r ${
                          failedTrackedCount 
                            ? 'from-red-500 to-red-600' 
                            : 'from-primary-400 via-primary-500 to-emerald-500'
                        }`}
                        style={{ width: `${batchProgressPercent}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                      <span>{trackerWarning ? 'Tracker stale' : STATUS_LABELS[aggregateTrackerStatus] || aggregateTrackerStatus || 'Chưa gửi'}</span>
                      <span>{batchProgressPercent}% hoàn thành</span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/20 p-4 dark:border-slate-850 dark:bg-slate-950/15">
                      <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">Tracker ID</p>
                      <p className="mt-1 text-xs font-bold text-gray-950 dark:text-slate-350 truncate" title={currentBatchId || 'N/A'}>
                        {currentBatchId || 'Chưa bắt đầu upload'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/20 p-4 dark:border-slate-850 dark:bg-slate-950/15">
                      <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">Tiến độ batch</p>
                      <p className="mt-1 text-xs font-bold text-gray-950 dark:text-slate-350 truncate">
                        {completedTrackedCount}/{trackedItemCount || uploadItems.length} file hoàn tất
                      </p>
                    </div>
                  </div>

                  {trackerWarning && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-300">
                      {trackerWarning}
                    </div>
                  )}

                  <div className="space-y-3">
                    {displayTrackedItems.map((item) => (
                      <div key={item.clientId} className="rounded-2xl border border-gray-150/60 bg-gray-50/30 p-4 dark:border-slate-850 dark:bg-slate-950/20">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-black text-gray-900 dark:text-slate-100">{item.title || item.sourceLabel}</p>
                            <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">
                              {item.currentStage ? (STAGE_LABELS[item.currentStage] || item.currentStage) : 'Chưa gửi'}
                            </p>
                          </div>
                          <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${
                            item.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                              : item.status === 'failed'
                              ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                              : item.status === 'processing' || item.status === 'queued'
                              ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                            {STATUS_LABELS[item.status] || item.status}
                          </span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary-400 to-emerald-500 transition-all duration-500"
                            style={{ width: `${item.progressPercent ?? 0}%` }}
                          />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.meetingId && (
                            <Button
                              variant="secondary"
                              onClick={() => navigate(`/meetings/${item.meetingId}`)}
                              className="h-9 rounded-2xl px-4 text-[10px] font-bold uppercase tracking-wider"
                            >
                              Mở meeting
                            </Button>
                          )}
                          {item.status === 'failed' && item.jobId && (
                            <Button
                              variant="secondary"
                              onClick={() => retryMutation.mutate(item.jobId!)}
                              isLoading={retryMutation.isPending}
                              className="h-9 rounded-2xl px-4 text-[10px] font-bold uppercase tracking-wider"
                            >
                              Retry file này
                            </Button>
                          )}
                        </div>
                        {item.errorMessage && (
                          <p className="mt-3 text-[11px] font-semibold text-red-600 dark:text-red-400">{item.errorMessage}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {jobsStatusQuery.error instanceof Error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300">
                      {jobsStatusQuery.error.message}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2.5 pt-2">
                    <Button
                      variant="secondary"
                      onClick={() => jobsStatusQuery.refetch()}
                      disabled={trackedJobIds.length === 0 || jobsStatusQuery.isFetching}
                      className="h-10 rounded-2xl px-5 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
                    >
                      {jobsStatusQuery.isFetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                      Cập nhật trạng thái
                    </Button>
                    {(trackerWarning || isTrackedBatchTerminal) && (
                      <Button
                        variant="secondary"
                        onClick={dismissTrackedBatch}
                        className="h-10 rounded-2xl px-5 text-xs font-bold uppercase tracking-wider"
                      >
                        Xóa theo dõi batch
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'live-test' && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-indigo-150 bg-indigo-50/20 p-5 dark:border-indigo-950 dark:bg-indigo-950/10">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 shadow-sm">
                  <Sparkles size={18} className="stroke-[1.8]" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-slate-200 text-sm leading-none pt-1">Chế độ ghi âm kiểm thử (Live Test Mode)</p>
                  <p className="mt-2 text-xs text-gray-500 dark:text-slate-450 leading-relaxed">
                    Dữ liệu âm thanh được truyền phát trực tiếp (audio stream) lên AI engine để nhận dạng. Đây là chế độ nháp, **không tạo cuộc họp hay lưu lịch sử** vào cơ sở dữ liệu. Kết quả phân tích sẽ biến mất khi bạn đóng tab hoặc rời trang.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-5 space-y-1.5 text-sm">
                <span className="block font-bold text-xs uppercase tracking-wider text-gray-400 dark:text-slate-500">STT Engine</span>
                <select
                  value={sttProvider}
                  onChange={(e) => setSttProvider(e.target.value)}
                  disabled={liveTest.isRecording || liveTest.isTranscribing}
                  className="h-11 w-full rounded-2xl border border-gray-200 bg-white px-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 disabled:opacity-50 dark:border-slate-750 dark:bg-slate-950 dark:text-slate-100"
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
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-red-600 hover:bg-red-700 active:bg-red-850 text-white px-5 text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-red-500/10"
                  >
                    {liveTest.isTranscribing ? <Loader2 size={14} className="animate-spin" /> : <Mic size={14} className="stroke-[2.5]" />}
                    {liveTest.isTranscribing ? 'Đang xử lý STT...' : 'Bắt đầu thu test'}
                  </button>
                ) : (
                  <button
                    onClick={liveTest.stopRecording}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-red-600 hover:bg-red-700 active:bg-red-850 text-white px-5 text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-red-500/20"
                  >
                    <Square size={14} className="fill-current stroke-[2.5]" />
                    Dừng thu (Đang ghi)
                  </button>
                )}
                <Button
                  variant="primary"
                  onClick={liveTest.analyze}
                  disabled={liveTest.isAnalyzing || liveTest.isTranscribing || (!liveTest.fullTranscript.trim() && !liveTest.interimTranscript.trim())}
                  isLoading={liveTest.isAnalyzing}
                  icon={<Sparkles size={14} />}
                  className="h-11 rounded-2xl text-xs font-bold uppercase tracking-wider px-5 shadow-lg shadow-primary-500/10"
                >
                  Tạo AI Notes
                </Button>
                <Button
                  variant="secondary"
                  onClick={liveTest.reset}
                  disabled={liveTest.isTranscribing}
                  icon={<Trash2 size={14} />}
                  className="h-11 rounded-2xl text-xs font-bold uppercase tracking-wider px-5"
                >
                  Xóa phiên test
                </Button>
              </div>

              <div className="mt-6 grid gap-4 grid-cols-2 md:grid-cols-4">
                <div className="rounded-2xl bg-gray-50/50 border border-gray-150 p-4 dark:bg-slate-950/20 dark:border-slate-850">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">Microphone</p>
                  <p className="mt-1.5 text-xs font-black text-gray-900 dark:text-slate-200">
                    {liveTest.isTranscribing ? 'Đang xử lý' : liveTest.isRecording ? 'Đang thu âm' : 'Đang dừng'}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold text-gray-450 dark:text-slate-500 leading-none">{liveTest.sttStatus}</p>
                </div>
                <div className="rounded-2xl bg-gray-50/50 border border-gray-150 p-4 dark:bg-slate-950/20 dark:border-slate-850">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">Engine test</p>
                  <p className="mt-1.5 text-xs font-black text-gray-900 dark:text-slate-200 truncate">
                    {STT_PROVIDER_OPTIONS.find(o => o.value === sttProvider)?.label.split(' ')[0] || 'Default'}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50/50 border border-gray-150 p-4 dark:bg-slate-950/20 dark:border-slate-850">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">Đoạn nhận diện (Chunks)</p>
                  <p className="mt-1.5 text-xs font-black text-gray-900 dark:text-slate-200">{liveTest.chunks.length} chunks</p>
                </div>
                <div className="rounded-2xl bg-gray-50/50 border border-gray-150 p-4 dark:bg-slate-950/20 dark:border-slate-850">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">Bản ghi chú AI</p>
                  <p className="mt-1.5 text-xs font-black text-gray-900 dark:text-slate-200 truncate">{liveTest.summaryStatus || 'Chưa tạo'}</p>
                </div>
              </div>

              {liveTest.error && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300">
                  {liveTest.error}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
                <h2 className="text-base font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider">Transcript nhận diện được</h2>
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-550">{isViWhisper ? 'Bản dịch sau khi nói' : 'Bản dịch thời gian thực'}</span>
              </div>
              <div className="mt-5 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {liveTest.interimTranscript && (
                  <div className="rounded-2xl border border-amber-250/30 bg-amber-50/40 p-4 dark:border-amber-900/25 dark:bg-amber-950/10 animate-pulse">
                    <div className="mb-2.5 flex items-center gap-2">
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black uppercase text-amber-700 dark:bg-amber-900/30 dark:text-amber-250">
                        Interim (Đang dịch)
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-105 font-medium">{liveTest.interimTranscript}</p>
                  </div>
                )}
                {liveTest.chunks.length === 0 && !liveTest.interimTranscript ? (
                  <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-250 p-6 text-center dark:border-slate-850 bg-gray-50/20 dark:bg-slate-950/10">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-400 dark:bg-slate-900/60 dark:text-slate-600">
                      <Mic size={18} className="stroke-[1.5] text-gray-300" />
                    </div>
                    <p className="mt-3 text-xs font-bold text-gray-500 dark:text-slate-400">Chưa có bản dịch</p>
                    <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 max-w-[220px] leading-relaxed mx-auto">
                      Nhấn "Bắt đầu thu test" và nói qua mic, transcript thời gian thực sẽ hiển thị tại đây.
                    </p>
                  </div>
                ) : liveTest.chunks.map((chunk) => (
                  <div key={chunk.id} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:border-slate-800 dark:bg-slate-850/35 relative pl-8 pr-4">
                    <div className="absolute left-2.5 top-5 h-3.5 w-3.5 rounded-full bg-primary-100 flex items-center justify-center dark:bg-primary-950/45">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                    </div>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-[9px] font-black text-primary-700 dark:bg-primary-950/30 dark:text-primary-350">
                        Đoạn thứ {chunk.chunkIndex + 1}
                      </span>
                      <span className="text-[9px] font-bold uppercase text-gray-400 dark:text-slate-500">{chunk.language}</span>
                    </div>
                    <p className="text-xs leading-relaxed text-gray-800 dark:text-slate-200">{chunk.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="pb-3 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
                <Sparkles size={16} className="text-primary-500" />
                <h2 className="text-base font-black text-gray-900 dark:text-slate-100 uppercase tracking-wider">AI Notes Phác thảo</h2>
              </div>
              {!aiNotes ? (
                <div className="mt-5 flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-250 p-6 text-center dark:border-slate-850 bg-gray-50/20 dark:bg-slate-950/10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-400 dark:bg-slate-900/60 dark:text-slate-600">
                    <Sparkles size={18} className="stroke-[1.5] text-gray-300" />
                  </div>
                  <p className="mt-3 text-xs font-bold text-gray-500 dark:text-slate-400">Chưa tạo ghi chú AI</p>
                  <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1 max-w-[200px] leading-relaxed mx-auto">
                    Nói tối thiểu vài câu, sau đó bấm nút “Tạo AI Notes” để sinh tóm tắt phác thảo cuộc họp ngay lập tức.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-5">
                  {aiNotes.meeting_summary && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-450 dark:text-slate-500">Tóm tắt tổng quan</p>
                      <p className="text-xs leading-relaxed text-gray-800 dark:text-slate-200 bg-gray-50/30 p-3 rounded-2xl border border-gray-150/40 dark:bg-slate-950/20 dark:border-slate-850">{aiNotes.meeting_summary}</p>
                    </div>
                  )}
                  {Array.isArray(aiNotes.key_points) && aiNotes.key_points.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-450 dark:text-slate-500">Ý chính thảo luận</p>
                      <ul className="space-y-2 text-xs text-gray-850 dark:text-slate-300 bg-gray-50/30 p-4 rounded-2xl border border-gray-150/40 dark:bg-slate-950/20 dark:border-slate-850">
                        {aiNotes.key_points.map((item, index) => (
                          <li key={index} className="flex items-start gap-2.5">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {actionItems.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-450 dark:text-slate-500">Công việc bàn giao</p>
                      <div className="space-y-2.5">
                        {actionItems.map((item, index) => (
                          <div key={index} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:bg-slate-800/40 dark:border-slate-850 hover:shadow-sm transition-shadow">
                            <p className="text-xs font-bold text-gray-900 dark:text-slate-100 leading-relaxed">{item.task}</p>
                            <div className="mt-2.5 flex flex-wrap gap-2 text-[10px] font-semibold text-gray-450 dark:text-slate-500">
                              <span className="bg-white dark:bg-slate-950 px-2 py-0.5 rounded border border-gray-150/50 dark:border-slate-850">{item.owner || 'Chưa phân vai'}</span>
                              {item.deadline && <span className="bg-white dark:bg-slate-950 px-2 py-0.5 rounded border border-gray-150/50 dark:border-slate-850">Hạn: {item.deadline}</span>}
                            </div>
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
                <h2 className="text-xs font-black text-gray-900 dark:text-slate-100 uppercase tracking-widest pb-3 border-b border-gray-100 dark:border-slate-800">PhoBERT NLP Metadata</h2>
                <pre className="mt-4 max-h-72 overflow-auto rounded-2xl bg-slate-950 p-4 text-[11px] text-white font-mono no-scrollbar leading-relaxed">
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
