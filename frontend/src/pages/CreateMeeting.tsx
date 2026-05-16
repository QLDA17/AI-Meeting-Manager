import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  Link2,
  Mic,
  Radio,
  User,
  Users,
  Video,
  Zap,
} from "lucide-react";
import { Badge, Button, Card, Input, MultiSelect, showToast } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useAppStore, useGlossaryStore, useOrgStore } from "../stores";
import api from "../services/api";

interface GroupMember {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  avatar_url?: string;
  role: string;
}

const generateMeetingCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 3; i += 1) {
    if (i > 0) code += "-";
    for (let j = 0; j < 3; j += 1) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return code;
};

const CreateMeeting: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { currentOrgId, currentOrg, groups, loadGroups } = useOrgStore();
  const { loadMeetings } = useAppStore();
  const { glossaries, loadGlossaries } = useGlossaryStore();

  const [title, setTitle] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedGlossaries, setSelectedGlossaries] = useState<string[]>([]);
  const [language, setLanguage] = useState("vi");
  const [enableCamera, setEnableCamera] = useState(true);
  const [enableMic, setEnableMic] = useState(true);
  const [enableRecord, setEnableRecord] = useState(true);
  const [enableSummary, setEnableSummary] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState<"code" | "link" | null>(null);
  const [meetingCode] = useState(generateMeetingCode);

  const requestedGroupId = searchParams.get("groupId") || "";
  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId),
    [groups, selectedGroupId],
  );
  const joinUrl = `${window.location.origin}/join/${meetingCode}`;
  const allSelected = groupMembers.length > 0 && selectedParticipants.length === groupMembers.length;

  useEffect(() => {
    if (!currentOrgId) return;
    loadGroups(currentOrgId);
    loadGlossaries(currentOrgId);
  }, [currentOrgId, loadGlossaries, loadGroups]);

  useEffect(() => {
    if (requestedGroupId && groups.some((group) => group.id === requestedGroupId)) {
      setSelectedGroupId(requestedGroupId);
      return;
    }
    if (!selectedGroupId && groups.length > 0) {
      setSelectedGroupId(groups[0].id);
      return;
    }
    if (selectedGroupId && groups.length > 0 && !groups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, requestedGroupId, selectedGroupId]);

  useEffect(() => {
    if (!selectedGroupId) {
      setGroupMembers([]);
      setSelectedParticipants([]);
      return;
    }

    setLoadingMembers(true);
    api
      .get(`/api/groups/${selectedGroupId}/members`)
      .then((res) => {
        const members = (res.data || [])
          .map((member: any) => ({
            id: member.id || member.user_id || member.userId,
            user_id: member.id || member.user_id || member.userId,
            name:
              `${member.first_name || ""} ${member.last_name || ""}`.trim() ||
              member.username ||
              member.email ||
              "Thành viên",
            email: member.email,
            avatar_url: member.avatar_url,
            role: member.role,
          }))
          .filter((member: GroupMember) => member.user_id !== user?.id);

        setGroupMembers(members);
        setSelectedParticipants(members.map((member: GroupMember) => member.user_id));
      })
      .catch(() => {
        setGroupMembers([]);
        setSelectedParticipants([]);
        showToast.error("Không thể tải thành viên trong nhóm");
      })
      .finally(() => setLoadingMembers(false));
  }, [selectedGroupId, user?.id]);

  const toggleSelectAll = () => {
    setSelectedParticipants(allSelected ? [] : groupMembers.map((member) => member.user_id));
  };

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  };

  const copyToClipboard = async (value: string, target: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedTarget(target);
      showToast.success(target === "code" ? "Đã sao chép mã tham gia" : "Đã sao chép link tham gia");
      window.setTimeout(() => setCopiedTarget(null), 1800);
    } catch {
      showToast.error("Không thể sao chép");
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentOrgId) {
      showToast.error("Chưa chọn tổ chức");
      return;
    }
    if (!title.trim()) {
      showToast.error("Vui lòng nhập tiêu đề cuộc họp");
      return;
    }
    if (!selectedGroupId) {
      showToast.error("Vui lòng chọn nhóm/phòng ban");
      return;
    }

    const start = new Date(Date.now() + 5000);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    setIsSubmitting(true);
    try {
      const response = await api.post("/api/meetings", {
        title: title.trim(),
        organization_id: currentOrgId,
        group_id: selectedGroupId,
        code: meetingCode,
        status: "live",
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
        description: `Cuộc họp live trong nhóm ${selectedGroup?.name || selectedGroupId}`,
        settings: {
          enableRecord,
          enableSummary,
          language,
          enableCamera,
          enableMic,
          glossaryIds: selectedGlossaries,
        },
        participant_ids: selectedParticipants,
      });

      await loadMeetings(currentOrgId);
      const roomCode = response.data?.code || meetingCode || response.data?.id;
      showToast.success("Đã tạo cuộc họp live");
      navigate(`/room/${roomCode}`, {
        state: {
          title: title.trim(),
          groupId: selectedGroupId,
          organizer: user?.displayName || user?.email || "Bạn",
          enableCamera,
          enableMic,
          enableRecord,
          enableSummary,
          participants: selectedParticipants,
        },
      });
    } catch (err: any) {
      showToast.error(err?.response?.data?.detail || "Không thể tạo cuộc họp live");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentOrgId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Card className="p-8 text-center">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-amber-500" />
          <h1 className="text-2xl font-black text-gray-900 dark:text-slate-100">Chưa chọn tổ chức</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
            Bạn cần chọn hoặc tham gia một tổ chức trước khi tạo cuộc họp live.
          </p>
          <Button className="mt-6" onClick={() => navigate("/setup-organization")}>
            Thiết lập tổ chức
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 pb-6 pt-6 lg:px-0">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-600 dark:bg-red-900/20 dark:text-red-300">
              <Radio size={14} className="animate-pulse" />
              Live meeting
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-slate-100 sm:text-3xl">
              Tạo cuộc họp live
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Chọn nhóm, người tham gia và cấu hình AI trước khi vào phòng họp.
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate(-1)} icon={<ArrowLeft size={16} />}>
            Quay lại
          </Button>
        </div>
      </motion.section>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Meeting Info */}
        <Card>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Thông tin cuộc họp</h2>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">
                Tổ chức: <span className="font-medium text-gray-700 dark:text-slate-300">{currentOrg?.name || currentOrgId}</span>
              </p>
            </div>
            <Badge variant="primary" className="w-fit text-[10px]">
              Tạo ngay
            </Badge>
          </div>

          <div className="space-y-4">
            <Input
              label="Tiêu đề cuộc họp"
              placeholder="Ví dụ: Daily sync, Họp xử lý gấp..."
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-200">
                Nhóm / Phòng ban
              </label>
              <div className="relative group">
                <select
                  value={selectedGroupId}
                  onChange={(event) => {
                    setSelectedGroupId(event.target.value);
                    setSelectedParticipants([]);
                  }}
                  className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white pl-4 pr-10 text-gray-900 transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {groups.length === 0 ? (
                    <option value="" disabled>
                      Chưa có nhóm nào
                    </option>
                  ) : (
                    groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-primary-500"
                  size={18}
                />
              </div>
              {groups.length === 0 && (
                <p className="text-xs font-medium text-amber-600 dark:text-amber-300">
                  Tổ chức này chưa có phòng ban/danh mục. Hãy tạo nhóm trước khi mở cuộc họp live.
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* Device + Invite side by side */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Devices */}
          <Card>
            <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-slate-100">Thiết bị</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Camera", icon: <Video size={20} />, active: enableCamera, toggle: () => setEnableCamera((v) => !v), color: "primary" },
                { label: "Micro", icon: <Mic size={20} />, active: enableMic, toggle: () => setEnableMic((v) => !v), color: "primary" },
                { label: "Ghi âm", icon: <Radio size={20} />, active: enableRecord, toggle: () => setEnableRecord((v) => !v), color: "red" },
              ].map((device) => (
                <button
                  key={device.label}
                  type="button"
                  onClick={device.toggle}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all ${
                    device.active
                      ? device.color === "red"
                        ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200"
                        : "border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-200"
                      : "border-gray-200 bg-gray-50 text-gray-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    device.active
                      ? device.color === "red" ? "bg-red-100 dark:bg-red-900/30" : "bg-primary-100 dark:bg-primary-900/30"
                      : "bg-gray-100 dark:bg-slate-700"
                  }`}>
                    {device.icon}
                  </div>
                  <span className="text-xs font-bold">{device.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    device.active
                      ? device.color === "red" ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300" : "bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300"
                      : "bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400"
                  }`}>
                    {device.active ? "Bật" : "Tắt"}
                  </span>
                </button>
              ))}
            </div>
          </Card>

          {/* QR Invite */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Mời tham gia</h2>
              <Badge variant="primary" className="text-[10px]">QR / Link</Badge>
            </div>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <div className="shrink-0 rounded-2xl border border-gray-200 bg-white p-3 dark:border-slate-700">
                <QRCodeSVG value={joinUrl} size={120} level="M" />
              </div>
              <div className="w-full min-w-0 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Mã tham gia
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 flex-1 items-center rounded-xl border border-gray-200 bg-gray-50 px-3 font-mono text-sm font-bold tracking-wider text-primary-700 dark:border-slate-700 dark:bg-slate-800 dark:text-primary-300">
                      {meetingCode}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      onClick={() => copyToClipboard(meetingCode, "code")}
                      icon={copiedTarget === "code" ? <Check size={16} className="text-primary-500" /> : <Copy size={16} />}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Link tham gia
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 min-w-0 flex-1 items-center rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs font-medium text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <Link2 size={14} className="mr-2 shrink-0 text-gray-400" />
                      <span className="truncate">{joinUrl}</span>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => copyToClipboard(joinUrl, "link")}
                      icon={copiedTarget === "link" ? <Check size={16} className="text-primary-500" /> : <Copy size={16} />}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* AI Config */}
        <Card>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-slate-100">
              <Zap size={18} className="text-primary-500" />
              Cấu hình AI & Kho kiến thức
            </h2>
            <Badge variant="primary" className="text-[10px]">Premium</Badge>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-200">
                Ngôn ngữ chính
              </label>
              <div className="relative group">
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white pl-4 pr-10 text-gray-900 transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  <option value="vi">🇻🇳 Tiếng Việt</option>
                  <option value="en">🇺🇸 Tiếng Anh</option>
                  <option value="zh">🇨🇳 Tiếng Trung</option>
                  <option value="ja">🇯🇵 Tiếng Nhật</option>
                  <option value="ko">🇰🇷 Tiếng Hàn</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>
            </div>

            <MultiSelect
              label="Kho kiến thức áp dụng"
              placeholder="Chọn từ điển chuyên ngành..."
              options={glossaries.map((glossary) => ({
                id: glossary.id,
                name: `${glossary.name}${glossary.scope === "GLOBAL" ? " (Hệ thống)" : ""}`,
              }))}
              selectedIds={selectedGlossaries}
              onChange={setSelectedGlossaries}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-6 border-t border-gray-100 pt-4 dark:border-slate-800">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={enableRecord}
                onChange={(event) => setEnableRecord(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Ghi âm & transcribe AI</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={enableSummary}
                onChange={(event) => setEnableSummary(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Tự động tóm tắt biên bản</span>
            </label>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-xl bg-primary-50/50 p-3 text-xs text-primary-700 dark:bg-primary-900/10 dark:text-primary-300">
            <BookOpen size={14} className="mt-0.5 shrink-0" />
            <p>
              Đang áp dụng <span className="font-bold">{selectedGlossaries.length}</span> kho kiến thức cho nhận diện giọng nói và biên bản.
            </p>
          </div>
        </Card>

        {/* Participants */}
        <Card>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-slate-100">
              <Users size={18} className="text-primary-500" />
              Thành viên tham gia
              {selectedParticipants.length > 0 && (
                <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  {selectedParticipants.length}
                </span>
              )}
            </h2>
            <span className="text-xs text-gray-500 dark:text-slate-400">
              Người tạo được thêm tự động
            </span>
          </div>

          {loadingMembers ? (
            <div className="flex items-center justify-center py-8 text-sm text-gray-400">
              <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
              Đang tải thành viên...
            </div>
          ) : groupMembers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400 dark:border-slate-700">
              Nhóm chưa có thành viên nào
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="flex w-full cursor-pointer items-center gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3 text-left transition hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:bg-slate-800"
              >
                <div className={`flex h-5 w-5 items-center justify-center rounded border-2 transition ${allSelected ? "border-primary-500 bg-primary-500" : "border-gray-300 dark:border-slate-600"}`}>
                  {allSelected && <Check size={12} className="text-white" />}
                </div>
                <span className="text-sm font-bold text-gray-800 dark:text-slate-200">Chọn tất cả</span>
                <span className="ml-auto text-xs text-gray-400">{groupMembers.length} thành viên</span>
              </button>

              <div className="max-h-64 divide-y divide-gray-50 overflow-y-auto dark:divide-slate-800">
                {groupMembers.map((member) => {
                  const isSelected = selectedParticipants.includes(member.user_id);
                  return (
                    <button
                      type="button"
                      key={member.user_id}
                      onClick={() => toggleParticipant(member.user_id)}
                      className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition hover:bg-gray-50 dark:hover:bg-slate-800/50"
                    >
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${isSelected ? "border-primary-500 bg-primary-500" : "border-gray-300 dark:border-slate-600"}`}>
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
                        {member.email && <p className="truncate text-xs text-gray-400">{member.email}</p>}
                      </div>
                      <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-slate-700 dark:text-slate-400">
                        {member.role === "group-admin" ? "Admin" : "Member"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 z-30 -mx-4 border-t border-gray-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900 lg:-mx-0 lg:rounded-b-2xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Info row */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5 dark:bg-slate-800">
                <Users size={14} className="text-gray-500 dark:text-slate-400" />
                <span className="text-xs font-bold text-gray-800 dark:text-slate-200">{selectedParticipants.length + 1}</span>
                <span className="text-xs text-gray-500 dark:text-slate-400">người</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-primary-50 px-2.5 py-1.5 dark:bg-primary-900/20">
                <Link2 size={14} className="text-primary-500" />
                <span className="font-mono text-xs font-bold text-primary-700 dark:text-primary-300">{meetingCode}</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={() => navigate("/calendar")} className="flex-1 sm:flex-none">
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                isLoading={isSubmitting}
                disabled={!selectedGroupId || groups.length === 0}
                icon={<ArrowRight size={16} />}
                className="flex-1 shadow-lg shadow-primary-500/20 sm:flex-none"
              >
                Vào phòng họp
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateMeeting;
