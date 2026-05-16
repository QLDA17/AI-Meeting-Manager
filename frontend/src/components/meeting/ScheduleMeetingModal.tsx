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
  Zap,
  Check,
  User,
} from 'lucide-react';
import { Modal, Button, Input, MultiSelect, Badge } from '../ui';
import { useCalendarStore, useGlossaryStore, useOrgStore, useAppStore } from '../../stores';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from '../ui/Toast';
import { buildLocalDateTime, toLocalDateStr, toMeetingApiDateTime } from '../../utils/meetingDateTime';

interface GroupMember {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  avatar_url?: string;
  role: string;
}

const ScheduleMeetingModal: React.FC = () => {
  const { isScheduleModalOpen, toggleScheduleModal, selectedDate } = useCalendarStore();
  const { glossaries, loadGlossaries } = useGlossaryStore();
  const { currentOrgId, groups, loadGroups } = useOrgStore();
  const { user } = useAuth();

  const [title, setTitle] = React.useState('');
  const [selectedGroupId, setSelectedGroupId] = React.useState<string>('');
  const [date, setDate] = React.useState(toLocalDateStr(selectedDate));
  const [time, setTime] = React.useState('14:00');
  const [endTime, setEndTime] = React.useState('');
  const [selectedParticipants, setSelectedParticipants] = React.useState<string[]>([]);
  const [groupMembers, setGroupMembers] = React.useState<GroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = React.useState(false);
  const [selectedGlossaries, setSelectedGlossaries] = React.useState<string[]>([]);
  const [language, setLanguage] = React.useState('vi');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // AI Options
  const [enableRecord, setEnableRecord] = React.useState(true);
  const [enableSummary, setEnableSummary] = React.useState(true);

  React.useEffect(() => {
    if (isScheduleModalOpen) {
      loadGlossaries(currentOrgId || undefined);
      if (currentOrgId) {
        loadGroups(currentOrgId);
      }
      setDate(toLocalDateStr(selectedDate));
    }
  }, [isScheduleModalOpen, currentOrgId, loadGlossaries, loadGroups, selectedDate]);

  React.useEffect(() => {
    if (groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  // Load group members when group changes
  React.useEffect(() => {
    if (!selectedGroupId) {
      setGroupMembers([]);
      return;
    }
    setLoadingMembers(true);
    api.get(`/api/groups/${selectedGroupId}/members`)
      .then(res => {
        const members = (res.data || [])
          .map((m: any) => ({
            id: m.id || m.user_id || m.userId,
            user_id: m.id || m.user_id || m.userId,
            name: `${m.first_name || ''} ${m.last_name || ''}`.trim() || m.username || m.email,
            email: m.email,
            avatar_url: m.avatar_url,
            role: m.role,
          }))
          // Loại người tạo ra khỏi list vì đã tự động được thêm
          .filter((m: GroupMember) => m.user_id !== user?.id);
        setGroupMembers(members);
        // Auto-select all members by default
        setSelectedParticipants(members.map((m: GroupMember) => m.user_id));
      })
      .catch(() => {
        setGroupMembers([]);
      })
      .finally(() => setLoadingMembers(false));
  }, [selectedGroupId, user?.id]);

  const { loadMeetings } = useAppStore();

  const allSelected = groupMembers.length > 0 && selectedParticipants.length === groupMembers.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedParticipants([]);
    } else {
      setSelectedParticipants(groupMembers.map(m => m.user_id));
    }
  };

  const toggleParticipant = (userId: string) => {
    if (selectedParticipants.includes(userId)) {
      setSelectedParticipants(selectedParticipants.filter(id => id !== userId));
    } else {
      setSelectedParticipants([...selectedParticipants, userId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      toast.error('Vui lòng nhập tiêu đề cuộc họp');
      return;
    }
    if (!selectedGroupId || !currentOrgId) {
      toast.error('Vui lòng chọn nhóm và tổ chức cho cuộc họp');
      return;
    }

    const start = buildLocalDateTime(date, time);
    if (start.getTime() < Date.now()) {
      toast.error('Không thể tạo cuộc họp trong quá khứ');
      return;
    }

    setIsSubmitting(true);
    try {
      const end = endTime
        ? buildLocalDateTime(date, endTime)
        : new Date(start.getTime() + 3600000);
      if (end <= start) {
        toast.error('Giờ kết thúc phải sau giờ bắt đầu');
        setIsSubmitting(false);
        return;
      }

      const meetingData = {
        title,
        organization_id: currentOrgId,
        group_id: selectedGroupId,
        scheduled_start: toMeetingApiDateTime(start),
        scheduled_end: toMeetingApiDateTime(end),
        status: 'upcoming',
        description: `Cuộc họp lên lịch trong nhóm ${groups.find(g => g.id === selectedGroupId)?.name || selectedGroupId}`,
        settings: {
          enableRecord,
          enableSummary,
          language,
          glossaryIds: selectedGlossaries,
        },
        participant_ids: selectedParticipants,
      };

      await api.post('/api/meetings', meetingData);
      toast.success('Đã lên lịch cuộc họp!');

      // Refresh meetings list to show on calendar
      await loadMeetings(currentOrgId);

      toggleScheduleModal(false);
      resetForm();
    } catch (err: any) {
      console.error('Failed to schedule meeting:', err);
      toast.error(err.response?.data?.detail || 'Lỗi khi lên lịch cuộc họp');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setSelectedParticipants([]);
    setSelectedGlossaries([]);
    setSelectedGroupId('');
    setDate(toLocalDateStr(new Date()));
    setTime('14:00');
    setEndTime('');
    setLanguage('vi');
    setEnableRecord(true);
    setEnableSummary(true);
    setGroupMembers([]);
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
                onChange={(e) => {
                  setSelectedGroupId(e.target.value);
                  setSelectedParticipants([]);
                }}
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
          <Input
            label="Giờ kết thúc (tùy chọn)"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            icon={<Clock size={16} />}
            placeholder="Mặc định: 1 giờ"
          />
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
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-slate-200">
              <Users size={16} className="text-primary-500" />
              Thành viên tham gia
              {selectedParticipants.length > 0 && (
                <span className="ml-1 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  {selectedParticipants.length}
                </span>
              )}
            </h4>
            <span className="text-xs text-gray-500 dark:text-slate-400">
              Chỉ thành viên được mời mới thấy cuộc họp này
            </span>
          </div>

          {loadingMembers ? (
            <div className="flex items-center justify-center py-6 text-sm text-gray-400">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent mr-2" />
              Đang tải thành viên...
            </div>
          ) : groupMembers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400 dark:border-slate-700">
              Nhóm chưa có thành viên nào
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
              {/* Select All */}
              <div
                onClick={toggleSelectAll}
                className="flex cursor-pointer items-center gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3 transition hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800"
              >
                <div className={`flex h-5 w-5 items-center justify-center rounded border-2 transition ${allSelected ? 'border-primary-500 bg-primary-500' : 'border-gray-300 dark:border-slate-600'}`}>
                  {allSelected && <Check size={12} className="text-white" />}
                </div>
                <span className="text-sm font-bold text-gray-800 dark:text-slate-200">Chọn tất cả</span>
                <span className="ml-auto text-xs text-gray-400">{groupMembers.length} thành viên</span>
              </div>

              {/* Member list */}
              <div className="max-h-48 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800">
                {groupMembers.map(member => {
                  const isSelected = selectedParticipants.includes(member.user_id);
                  return (
                    <div
                      key={member.user_id}
                      onClick={() => toggleParticipant(member.user_id)}
                      className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition hover:bg-gray-50 dark:hover:bg-slate-800/50"
                    >
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${isSelected ? 'border-primary-500 bg-primary-500' : 'border-gray-300 dark:border-slate-600'}`}>
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                          <User size={14} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800 dark:text-slate-200">{member.name}</p>
                        {member.email && (
                          <p className="truncate text-xs text-gray-400">{member.email}</p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-slate-700 dark:text-slate-400">
                        {member.role === 'group-admin' ? 'Admin' : 'Member'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
