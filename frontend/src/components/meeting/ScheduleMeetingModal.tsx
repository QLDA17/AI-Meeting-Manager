import React from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Users, 
  Globe, 
  BookOpen, 
  AlertCircle, 
  ChevronDown,
  Video,
  Mic,
  Zap
} from 'lucide-react';
import { Modal, Button, Input, MultiSelect, Badge } from '../ui';
import { useCalendarStore, useGlossaryStore, useOrgStore } from '../../stores';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../ui/Toast';

const ScheduleMeetingModal: React.FC = () => {
  const { isScheduleModalOpen, toggleScheduleModal, selectedDate } = useCalendarStore();
  const { glossaries, loadGlossaries } = useGlossaryStore();
  const { currentOrgId, groups, loadGroups } = useOrgStore();
  const { user } = useAuth();

  const [title, setTitle] = React.useState('');
  const [selectedGroupId, setSelectedGroupId] = React.useState<string>('');
  const [date, setDate] = React.useState(selectedDate.toISOString().split('T')[0]);
  const [time, setTime] = React.useState('14:00');
  const [duration, setDuration] = React.useState('60');
  const [selectedParticipants, setSelectedParticipants] = React.useState<string[]>([]);
  const [selectedGlossaries, setSelectedGlossaries] = React.useState<string[]>([]);
  const [language, setLanguage] = React.useState('vi');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  // AI Options
  const [enableRecord, setEnableRecord] = React.useState(true);
  const [enableSummary, setEnableSummary] = React.useState(true);

  React.useEffect(() => {
    if (isScheduleModalOpen) {
      loadGlossaries(currentOrgId || undefined);
      if (currentOrgId) loadGroups(currentOrgId);
      setDate(selectedDate.toISOString().split('T')[0]);
    }
  }, [isScheduleModalOpen, currentOrgId, loadGlossaries, loadGroups, selectedDate]);

  React.useEffect(() => {
    if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      toast.error('Vui lòng nhập tiêu đề cuộc họp');
      return;
    }
    if (!selectedGroupId) {
      toast.error('Vui lòng chọn nhóm cho cuộc họp');
      return;
    }

    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      toast.success('📅 Đã lên lịch cuộc họp và lưu vào lịch biểu!');
      setIsSubmitting(false);
      toggleScheduleModal(false);
      resetForm();
    }, 1000);
  };

  const resetForm = () => {
    setTitle('');
    setSelectedParticipants([]);
    setSelectedGlossaries([]);
  };

  return (
    <Modal
      isOpen={isScheduleModalOpen}
      onClose={() => toggleScheduleModal(false)}
      title="📅 Lên lịch cuộc họp trí tuệ nhân tạo"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6 py-2">
        {/* Basic Info Section */}
        <div className="space-y-4">
          <Input
            label="Tiêu đề cuộc họp"
            placeholder="Ví dụ: Sprint Review Q2, Planning Dự án MUTI..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-200">
              Chọn nhóm (Project/Group)
            </label>
            <div className="relative group">
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full h-11 pl-4 pr-10 appearance-none rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {groups.length === 0 ? (
                  <option value="" disabled>Chưa có nhóm nào</option>
                ) : (
                  groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:text-primary-500 transition-colors" size={18} />
            </div>
          </div>
        </div>

        {/* Date & Time Section */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input
            label="Ngày họp"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            icon={<CalendarIcon size={16} />}
          />
          <Input
            label="Giờ bắt đầu"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            icon={<Clock size={16} />}
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
              Thời lượng
            </label>
            <div className="relative group">
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full h-11 pl-4 pr-10 appearance-none rounded-xl border border-gray-200 bg-white text-gray-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="15">15 phút</option>
                <option value="30">30 phút</option>
                <option value="45">45 phút</option>
                <option value="60">60 phút</option>
                <option value="90">90 phút</option>
                <option value="120">120 phút</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>
        </div>

        {/* AI & Knowledge Base Integration */}
        <div className="rounded-2xl border border-primary-100 bg-primary-50/30 p-5 dark:border-primary-900/30 dark:bg-primary-900/5">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-sm font-bold text-primary-800 dark:text-primary-300">
              <Zap size={18} className="text-primary-600" />
              Cấu hình Trợ lý AI & Kho kiến thức
            </h4>
            <Badge variant="primary" className="text-[10px]">Premium Feature</Badge>
          </div>
          
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                  Ngôn ngữ chính của cuộc họp
                </label>
                <div className="relative group">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full h-10 pl-3 pr-10 appearance-none rounded-xl border border-gray-200 bg-white text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="vi">🇻🇳 Tiếng Việt</option>
                    <option value="en">🇺🇸 Tiếng Anh</option>
                    <option value="zh">🇨🇳 Tiếng Trung</option>
                    <option value="ja">🇯🇵 Tiếng Nhật</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                </div>
              </div>

              <MultiSelect
                label="Áp dụng Kho kiến thức (Glossary)"
                placeholder="Chọn thư viện từ vựng..."
                options={glossaries.map(g => ({ 
                  id: g.id, 
                  name: `${g.name} (${g.scope === 'GLOBAL' ? 'Hệ thống' : 'Nội bộ'})` 
                }))}
                selectedIds={selectedGlossaries}
                onChange={setSelectedGlossaries}
              />
            </div>

            {/* AI Toggles */}
            <div className="flex flex-wrap gap-4 pt-2 border-t border-primary-100 dark:border-primary-900/20">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={enableRecord}
                  onChange={(e) => setEnableRecord(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Ghi âm & Transcribe AI</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={enableSummary}
                  onChange={(e) => setEnableSummary(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Tự động tóm tắt biên bản</span>
              </label>
            </div>
          </div>
          
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-white/50 p-3 text-xs text-blue-700 dark:bg-slate-800/50 dark:text-blue-300">
            <BookOpen size={14} className="mt-0.5 shrink-0" />
            <p>
              Hệ thống sẽ sử dụng các thuật ngữ từ **{selectedGlossaries.length || "0"} thư viện kiến thức** đã chọn để cải thiện độ chính xác khi nhận diện giọng nói và viết biên bản.
            </p>
          </div>
        </div>

        {/* Participants Section */}
        <div className="rounded-2xl border border-gray-200 dark:border-slate-800 p-1">
           <MultiSelect
            label="Mời thành viên tham gia"
            placeholder="Tìm kiếm theo tên hoặc email..."
            options={[
              { id: 'u1', name: 'Nguyễn Văn A (Quản lý)' },
              { id: 'u2', name: 'Trần Thị B (Kỹ thuật)' },
              { id: 'u3', name: 'Lê Văn C (Đối tác)' },
              { id: 'u4', name: 'Phạm Thị D (Thư ký)' },
            ]}
            selectedIds={selectedParticipants}
            onChange={setSelectedParticipants}
          />
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-6 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Users size={14} />
            <span>{selectedParticipants.length + 1} người sẽ nhận được thông báo</span>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => toggleScheduleModal(false)} type="button" className="px-6">
              Hủy bỏ
            </Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting} className="px-8 shadow-lg shadow-primary-500/20">
              Xác nhận lên lịch
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default ScheduleMeetingModal;
