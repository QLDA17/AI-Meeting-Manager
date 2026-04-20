/**
 * UploadAudio - Trang tải âm thanh lên
 * Upload audio file với multi-step flow
 */
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Mic,
  Clock,
  Users,
  FileAudio,
  CheckCircle2,
  X,
  Loader2,
  Music,
  Globe,
  FileText,
} from 'lucide-react';
import { useOrgStore, useAppStore } from '../../stores';
import { formatFileSize } from '../../utils';
import type { Meeting } from '../../types';

type UploadStep = 'context' | 'upload' | 'details' | 'processing' | 'success';

const UploadAudio: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrg, groups, setCurrentGroup } = useOrgStore();
  const { addMeeting } = useAppStore();

  // State
  const [currentStep, setCurrentStep] = useState<UploadStep>('context');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().split('T')[0]);
  const [meetingTime, setMeetingTime] = useState('14:00');
  const [attendees, setAttendees] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [processingStage, setProcessingStage] = useState(0);
  const [processingComplete, setProcessingComplete] = useState(false);

  // Processing options
  const [aiSummary, setAiSummary] = useState(true);
  const [translation, setTranslation] = useState(true);
  const [speakerDiarization, setSpeakerDiarization] = useState(true);
  const [sttProvider, setSttProvider] = useState('google');
  const [sourceLanguage, setSourceLanguage] = useState('vi');
  const [targetLanguage, setTargetLanguage] = useState('en');

  const orgGroups = currentOrg ? groups.filter((g) => g.orgId === currentOrg.id) : [];

  const steps = [
    { key: 'context', label: 'Bối cảnh', icon: <Users size={16} /> },
    { key: 'upload', label: 'Tải tệp', icon: <Upload size={16} /> },
    { key: 'details', label: 'Chi tiết', icon: <FileText size={16} /> },
    { key: 'processing', label: 'Xử lý', icon: <Loader2 size={16} /> },
    { key: 'success', label: 'Hoàn thành', icon: <CheckCircle2 size={16} /> },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) handleFileSelect(files[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = (file: File) => {
    const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/m4a'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(wav|mp3|m4a)$/i)) {
      alert('Định dạng không hợp lệ. Vui lòng tải lên tệp .wav, .mp3 hoặc .m4a');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      alert('Tệp quá lớn. Kích thước tối đa là 50MB');
      return;
    }
    setSelectedFile(file);
    if (!meetingTitle) setMeetingTitle(file.name.replace(/\.[^/.]+$/, ''));
  };

  const handleNext = () => {
    switch (currentStep) {
      case 'context':
        if (selectedGroupId) setCurrentStep('upload');
        break;
      case 'upload':
        if (selectedFile) setCurrentStep('details');
        break;
      case 'details':
        if (meetingTitle) startProcessing();
        break;
    }
  };

  const startProcessing = () => {
    setCurrentStep('processing');
    setProcessingStage(0);
    setProcessingComplete(false);

    // Simulate upload then processing stages
    setTimeout(() => startProcessingStages(), 1000);
  };

  const startProcessingStages = () => {
    const stages = [
      { name: 'Chuyển văn bản', duration: 2000, active: true },
      { name: 'Phân tách người nói', duration: 1500, active: speakerDiarization },
      { name: 'Dịch thuật', duration: 1500, active: translation },
      { name: 'Tóm tắt AI', duration: 2000, active: aiSummary },
    ].filter((s) => s.active);

    let currentStage = 0;

    const processNext = () => {
      if (currentStage >= stages.length) {
        setProcessingComplete(true);
        setTimeout(() => setCurrentStep('success'), 1000);
        return;
      }
      setProcessingStage(currentStage);
      setTimeout(() => {
        currentStage++;
        processNext();
      }, stages[currentStage].duration);
    };

    processNext();
  };

  const activeStages = [
    { name: 'Chuyển văn bản', icon: <Mic size={18} />, active: true },
    { name: 'Phân tách người nói', icon: <Users size={18} />, active: speakerDiarization },
    { name: 'Dịch thuật', icon: <Globe size={18} />, active: translation },
    { name: 'Tóm tắt AI', icon: <FileText size={18} />, active: aiSummary },
  ].filter((s) => s.active);

  const handleUploadComplete = () => {
    const newMeeting: Meeting = {
      id: `meeting-${Date.now()}`,
      groupId: selectedGroupId,
      orgId: currentOrg?.id || '',
      title: meetingTitle,
      description,
      startTime: new Date(`${meetingDate}T${meetingTime}`),
      endTime: new Date(`${meetingDate}T${meetingTime}`),
      duration: 60,
      status: 'completed',
      attendees: attendees
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean)
        .map((name, i) => ({
          id: `user-up-${i}`,
          email: '',
          firstName: name.split(' ')[0] || '',
          lastName: name.split(' ').slice(1).join(' ') || '',
          displayName: name,
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true,
          orgMemberships: [],
          groupMemberships: [],
        })),
      createdBy: 'user-001',
      createdAt: new Date(),
      updatedAt: new Date(),
      summary: 'Tóm tắt AI sẽ được tạo sau khi xử lý',
      keyPoints: ['Điểm chính 1', 'Điểm chính 2'],
    };

    addMeeting(newMeeting);
    if (selectedGroupId) setCurrentGroup(selectedGroupId);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-slate-100">
            Tải âm thanh mới
          </h1>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="rounded-xl border border-gray-200 p-2 text-gray-400 hover:bg-gray-50 dark:border-slate-700"
        >
          <X size={20} />
        </button>
      </div>

      {/* Steps */}
      <div className="flex items-center justify-between rounded-2xl bg-gray-100 p-2 dark:bg-slate-800">
        {steps.map((step, idx) => (
          <div
            key={step.key}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition-all ${
              idx <= currentStepIndex
                ? 'bg-white text-primary-600 shadow-sm dark:bg-slate-700 dark:text-primary-400'
                : 'text-gray-400'
            }`}
          >
            {step.icon}
            <span className="hidden sm:inline">{step.label}</span>
          </div>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {/* Step 1: Context */}
        {currentStep === 'context' && (
          <motion.div
            key="context"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="rounded-3xl border border-gray-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-900"
          >
            <h3 className="mb-6 text-xl font-bold">Chọn nơi lưu trữ</h3>
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-500">Tổ chức</label>
                <div className="rounded-xl bg-gray-50 px-4 py-3 font-bold dark:bg-slate-800">
                  {currentOrg?.name || 'Chưa chọn tổ chức'}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-500">Nhóm nhận bản ghi</label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">-- Chọn nhóm --</option>
                  {orgGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button
                disabled={!selectedGroupId}
                onClick={handleNext}
                className="rounded-xl bg-primary-600 px-8 py-3 font-bold text-white transition hover:bg-primary-700 disabled:opacity-50"
              >
                Tiếp tục
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Upload */}
        {currentStep === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-3xl border border-gray-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900"
          >
            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
                className={`cursor-pointer rounded-2xl border-4 border-dashed p-10 transition ${
                  isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-400'
                }`}
              >
                <input
                  id="file-input"
                  type="file"
                  accept=".wav,.mp3,.m4a,audio/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
                <Music size={60} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-bold text-gray-700 dark:text-slate-300">
                  Kéo thả file âm thanh vào đây
                </p>
                <p className="text-sm text-gray-400">Hỗ trợ .wav, .mp3, .m4a (Max 50MB)</p>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-2xl bg-primary-50 p-6 dark:bg-primary-900/10">
                <div className="flex items-center gap-4">
                  <FileAudio size={40} className="text-primary-600" />
                  <div className="text-left">
                    <p className="font-bold text-gray-900 dark:text-slate-100">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedFile(null)} className="text-red-500">
                  <X size={20} />
                </button>
              </div>
            )}
            <div className="mt-10 flex justify-between">
              <button onClick={() => setCurrentStep('context')} className="font-bold text-gray-500">
                Quay lại
              </button>
              <button
                disabled={!selectedFile}
                onClick={handleNext}
                className="rounded-xl bg-primary-600 px-8 py-3 font-bold text-white transition hover:bg-primary-700 disabled:opacity-50"
              >
                Tiếp tục
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Details */}
        {currentStep === 'details' && (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-3xl border border-gray-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-bold text-gray-500">Tiêu đề cuộc họp</label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-primary-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:bg-slate-800">
                  <label className="mb-2 block text-[10px] font-black uppercase text-gray-400">
                    Provider STT
                  </label>
                  <select
                    value={sttProvider}
                    onChange={(e) => setSttProvider(e.target.value)}
                    className="w-full bg-transparent text-sm font-bold outline-none"
                  >
                    <option value="google">Google Gemini (Nhanh)</option>
                    <option value="whisper">OpenAI Whisper (Chuẩn)</option>
                  </select>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:bg-slate-800">
                  <label className="mb-2 block text-[10px] font-black uppercase text-gray-400">
                    Ngôn ngữ gốc
                  </label>
                  <select
                    value={sourceLanguage}
                    onChange={(e) => setSourceLanguage(e.target.value)}
                    className="w-full bg-transparent text-sm font-bold outline-none"
                  >
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">Tiếng Anh</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl bg-gray-50 p-4 dark:bg-slate-800">
                <p className="text-xs font-black uppercase text-gray-400">Cấu hình AI nâng cao</p>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={aiSummary}
                    onChange={(e) => setAiSummary(e.target.checked)}
                    className="h-5 w-5 rounded-md text-primary-600"
                  />
                  <span className="text-sm font-bold">Tự động tóm tắt & trích xuất việc cần làm</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={speakerDiarization}
                    onChange={(e) => setSpeakerDiarization(e.target.checked)}
                    className="h-5 w-5 rounded-md text-primary-600"
                  />
                  <span className="text-sm font-bold">Nhận diện và phân tách người nói</span>
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={translation}
                      onChange={(e) => setTranslation(e.target.checked)}
                      className="h-5 w-5 rounded-md text-primary-600"
                    />
                    <span className="text-sm font-bold">Dịch thuật tự động</span>
                  </label>
                  {translation && (
                    <select
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      className="ml-8 rounded-lg border border-gray-200 px-3 py-1 text-xs font-bold outline-none"
                    >
                      <option value="en">Sang Tiếng Anh</option>
                      <option value="vi">Sang Tiếng Việt</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-10 flex justify-between">
              <button onClick={() => setCurrentStep('upload')} className="font-bold text-gray-500">
                Quay lại
              </button>
              <button
                disabled={!meetingTitle.trim()}
                onClick={handleNext}
                className="rounded-xl bg-primary-600 px-8 py-3 font-bold text-white shadow-lg shadow-primary-500/20 disabled:opacity-50"
              >
                Bắt đầu xử lý
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Processing */}
        {currentStep === 'processing' && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-3xl border border-gray-200 bg-white p-10 dark:border-slate-700 dark:bg-slate-900"
          >
            <h3 className="mb-2 text-center text-xl font-black">Đang phân tích AI...</h3>
            <p className="mb-10 text-center text-sm text-gray-500">
              Hệ thống đang sử dụng {sttProvider.toUpperCase()} để xử lý
            </p>

            <div className="space-y-4">
              {activeStages.map((stage, idx) => {
                const isComplete = idx < processingStage;
                const isCurrent = idx === processingStage && !processingComplete;
                return (
                  <div
                    key={stage.name}
                    className={`flex items-center gap-4 rounded-2xl border p-4 transition ${
                      isCurrent ? 'border-primary-500 bg-primary-50/30' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                      {isComplete ? (
                        <CheckCircle2 className="text-green-500" />
                      ) : isCurrent ? (
                        <Loader2 className="animate-spin text-primary-600" />
                      ) : (
                        <Clock className="text-gray-300" />
                      )}
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        isCurrent ? 'text-primary-700' : isComplete ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {stage.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Step 5: Success */}
        {currentStep === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onAnimationComplete={() => {
              if (currentStep === 'success') handleUploadComplete();
            }}
            className="rounded-3xl border border-gray-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 size={48} />
            </div>
            <h2 className="text-3xl font-black">Hoàn tất!</h2>
            <p className="mt-4 text-gray-500">Bản ghi của bạn đã được xử lý và sẵn sàng để xem.</p>
            <div className="mt-10 flex flex-col gap-3">
              <button
                onClick={() => navigate('/meetings')}
                className="rounded-xl bg-primary-600 py-3 font-black text-white shadow-lg shadow-primary-500/20"
              >
                Xem bản ghi ngay
              </button>
              <button onClick={() => navigate('/')} className="font-bold text-gray-500">
                Về trang chủ
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UploadAudio;
