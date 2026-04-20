/**
 * CreateMeeting - Tạo cuộc họp mới với QR, mã tham gia, cài đặt thiết bị
 */
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  Plus,
  Users,
  Copy,
  Check,
  ArrowRight,
  Mic,
  Video,
  Settings,
  X,
  UserPlus,
  Link2,
  ChevronDown,
} from "lucide-react";
import { Card, Button, Input, Tooltip, showToast } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useOrgStore } from "../stores";

const generateMeetingCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 3; i++) {
    if (i > 0) code += "-";
    for (let j = 0; j < 3; j++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return code;
};

interface Participant {
  id: string;
  name: string;
  role: "organizer" | "presenter" | "attendee";
  avatar?: string;
}

const CreateMeeting: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { groups } = useOrgStore();
  
  const [step, setStep] = useState<"setup" | "invite">("setup");
  const [title, setTitle] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [meetingCode] = useState(generateMeetingCode());
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([
    {
      id: user?.id || "1",
      name: user?.displayName || user?.email || "Bạn",
      role: "organizer",
    },
  ]);
  const [enableCamera, setEnableCamera] = useState(true);
  const [enableMic, setEnableMic] = useState(true);
  const [enableRecord, setEnableRecord] = useState(true);

  // Set initial group from URL
  useEffect(() => {
    const groupId = searchParams.get("groupId");
    if (groupId) {
      setSelectedGroupId(groupId);
    } else if (groups.length > 0) {
      setSelectedGroupId(groups[0].id);
    }
  }, [searchParams, groups]);

  const joinUrl = `${window.location.origin}/join/${meetingCode}`;

  const addParticipant = () => {
    if (!inviteEmail.trim()) return;
    if (participants.some((p) => p.name === inviteEmail.trim())) {
      showToast.error("Thành viên đã có trong danh sách");
      return;
    }
    setParticipants((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: inviteEmail.trim(),
        role: "attendee",
      },
    ]);
    setInviteEmail("");
    showToast.success("Đã thêm thành viên");
  };

  const removeParticipant = (id: string) => {
    if (id === user?.id || id === "1") return;
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const changeRole = (id: string, role: Participant["role"]) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, role } : p))
    );
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(meetingCode);
      setCopied(true);
      showToast.success("Đã sao chép mã tham gia!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast.error("Không thể sao chép");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      showToast.success("Đã sao chép link tham gia!");
    } catch {
      showToast.error("Không thể sao chép");
    }
  };

  const startMeeting = () => {
    if (!title.trim()) {
      showToast.error("Vui lòng nhập tên cuộc họp");
      return;
    }
    if (!selectedGroupId) {
      showToast.error("Vui lòng chọn nhóm cho cuộc họp");
      return;
    }
    navigate(`/room/${meetingCode}`, {
      state: {
        title,
        groupId: selectedGroupId,
        organizer: user?.displayName || user?.email || "Bạn",
        enableCamera,
        enableMic,
        enableRecord,
        participants,
      },
    });
  };

  const roleLabels: Record<string, { label: string; color: string }> = {
    organizer: { label: "Tổ chức", color: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-200" },
    presenter: { label: "Trình bày", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200" },
    attendee: { label: "Tham dự", color: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300" },
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel-glass rounded-3xl border border-gray-200 p-6 shadow-card dark:border-slate-700"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-h1 text-gray-900 dark:text-slate-100">
              {step === "setup" ? "Tạo cuộc họp mới" : "Mời thành viên"}
            </h1>
            <p className="mt-1 text-body text-gray-600 dark:text-slate-300">
              {step === "setup"
                ? "Thiết lập phòng họp trực tuyến với AI ghi âm tự động"
                : "Chia sẻ mã hoặc QR để mời người tham gia"}
            </p>
          </div>
          {step === "invite" && (
            <Button variant="ghost" onClick={() => setStep("setup")}>
              Quay lại
            </Button>
          )}
        </div>
      </motion.section>

      {step === "setup" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Meeting Info */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 space-y-4"
          >
            <Card>
              <h2 className="mb-4 text-h3 text-gray-900 dark:text-slate-100">Thông tin cuộc họp</h2>
              <div className="space-y-4">
                <Input
                  label="Tên cuộc họp"
                  placeholder="VD: Họp dự án Q2, Sprint Review..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-200 ml-1">
                    Chọn nhóm
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
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-slate-200">
                    Mã tham gia
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 flex-1 items-center rounded-xl border border-gray-200 bg-gray-50 px-4 font-mono text-lg font-bold tracking-widest text-primary-700 dark:border-slate-700 dark:bg-slate-800 dark:text-primary-300">
                      {meetingCode}
                    </div>
                    <Tooltip content="Sao chép mã" shortcut="Ctrl+C">
                      <Button variant="secondary" onClick={copyCode} icon={copied ? <Check size={16} /> : <Copy size={16} />} />
                    </Tooltip>
                  </div>
                </div>
              </div>
            </Card>

            {/* Device Settings */}
            <Card>
              <h2 className="mb-4 text-h3 text-gray-900 dark:text-slate-100">Thiết bị</h2>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setEnableCamera(!enableCamera)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition ${
                    enableCamera
                      ? "border-primary-300 bg-primary-50 dark:border-primary-800 dark:bg-primary-900/20"
                      : "border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800"
                  }`}
                >
                  <Video size={24} className={enableCamera ? "text-primary-600" : "text-gray-400"} />
                  <span className="text-caption font-medium">Camera</span>
                  <span className={`text-caption ${enableCamera ? "text-primary-600" : "text-gray-400"}`}>
                    {enableCamera ? "Bật" : "Tắt"}
                  </span>
                </button>
                <button
                  onClick={() => setEnableMic(!enableMic)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition ${
                    enableMic
                      ? "border-primary-300 bg-primary-50 dark:border-primary-800 dark:bg-primary-900/20"
                      : "border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800"
                  }`}
                >
                  <Mic size={24} className={enableMic ? "text-primary-600" : "text-gray-400"} />
                  <span className="text-caption font-medium">Micro</span>
                  <span className={`text-caption ${enableMic ? "text-primary-600" : "text-gray-400"}`}>
                    {enableMic ? "Bật" : "Tắt"}
                  </span>
                </button>
                <button
                  onClick={() => setEnableRecord(!enableRecord)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition ${
                    enableRecord
                      ? "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20"
                      : "border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800"
                  }`}
                >
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full ${enableRecord ? "bg-red-500" : "bg-gray-300"}`}>
                    <div className={`h-2 w-2 rounded-full ${enableRecord ? "animate-pulse bg-white" : "bg-gray-500"}`} />
                  </div>
                  <span className="text-caption font-medium">Ghi âm AI</span>
                  <span className={`text-caption ${enableRecord ? "text-red-600" : "text-gray-400"}`}>
                    {enableRecord ? "Bật" : "Tắt"}
                  </span>
                </button>
              </div>
            </Card>

            {/* Add Participants */}
            <Card>
              <h2 className="mb-4 text-h3 text-gray-900 dark:text-slate-100">Thành viên</h2>
              <div className="flex gap-2">
                <Input
                  placeholder="Email hoặc tên thành viên..."
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addParticipant()}
                  leftIcon={<UserPlus size={16} />}
                />
                <Button onClick={addParticipant} icon={<Plus size={16} />}>
                  Thêm
                </Button>
              </div>

              <div className="mt-4 space-y-2">
                {participants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-200">
                        {p.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-body font-medium text-gray-800 dark:text-slate-100">
                          {p.name}
                          {p.id === (user?.id || "1") && (
                            <span className="ml-2 text-caption text-gray-400">(bạn)</span>
                          )}
                        </p>
                        <select
                          value={p.role}
                          onChange={(e) => changeRole(p.id, e.target.value as Participant["role"])}
                          disabled={p.id === (user?.id || "1")}
                          className="mt-0.5 text-caption text-gray-500 bg-transparent border-none outline-none dark:text-slate-400"
                        >
                          <option value="organizer">Tổ chức</option>
                          <option value="presenter">Trình bày</option>
                          <option value="attendee">Tham dự</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-caption font-medium ${roleLabels[p.role].color}`}>
                        {roleLabels[p.role].label}
                      </span>
                      {p.id !== (user?.id || "1") && (
                        <button
                          onClick={() => removeParticipant(p.id)}
                          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Sidebar - Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            <Card className="text-center">
              <h3 className="mb-3 text-h4 text-gray-900 dark:text-slate-100">Bắt đầu ngay</h3>
              <p className="mb-4 text-caption text-gray-500">
                {participants.length} thành viên · {enableRecord ? "Ghi âm AI bật" : "Ghi âm AI tắt"}
              </p>
              <Button onClick={startMeeting} className="w-full" size="lg" icon={<ArrowRight size={18} />}>
                Vào phòng họp
              </Button>
              <div className="mt-3">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setStep("invite")}
                  icon={<Users size={16} />}
                >
                  Mời thành viên
                </Button>
              </div>
            </Card>

            <Card>
              <h3 className="mb-3 text-h4 text-gray-900 dark:text-slate-100">Tham gia nhanh</h3>
              <p className="mb-3 text-caption text-gray-500">
                Người khác có thể nhập mã để tham gia:
              </p>
              <div className="rounded-xl border border-dashed border-primary-300 bg-primary-50 p-4 text-center dark:border-primary-800 dark:bg-primary-900/10">
                <p className="font-mono text-xl font-bold tracking-widest text-primary-700 dark:text-primary-300">
                  {meetingCode}
                </p>
              </div>
            </Card>
          </motion.div>
        </div>
      ) : (
        /* INVITE STEP */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* QR Code */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="flex flex-col items-center py-8">
              <h2 className="mb-6 text-h3 text-gray-900 dark:text-slate-100">Quét mã QR</h2>
              <div className="rounded-2xl border-2 border-primary-200 bg-white p-4 dark:border-primary-800 dark:bg-slate-800">
                <QRCodeSVG
                  value={joinUrl}
                  size={220}
                  level="M"
                  className="text-gray-900 dark:text-slate-100"
                  style={{ width: 220, height: 220 }}
                />
              </div>
              <p className="mt-4 text-caption text-gray-500">
                Quét bằng camera điện thoại để tham gia
              </p>
            </Card>
          </motion.div>

          {/* Share Options */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <Card>
              <h2 className="mb-4 text-h3 text-gray-900 dark:text-slate-100">Chia sẻ mã tham gia</h2>

              <div className="space-y-4">
                {/* Copy Code */}
                <div className="flex items-center gap-2">
                  <div className="flex h-12 flex-1 items-center rounded-xl border border-gray-200 bg-gray-50 px-4 font-mono text-lg font-bold tracking-widest text-primary-700 dark:border-slate-700 dark:bg-slate-800 dark:text-primary-300">
                    {meetingCode}
                  </div>
                  <Button onClick={copyCode} icon={copied ? <Check size={16} /> : <Copy size={16} />}>
                    {copied ? "Đã copy" : "Copy mã"}
                  </Button>
                </div>

                {/* Copy Link */}
                <div className="flex items-center gap-2">
                  <div className="flex h-10 flex-1 items-center rounded-xl border border-gray-200 bg-gray-50 px-3 text-caption text-gray-600 truncate dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Link2 size={14} className="mr-2 shrink-0" />
                    {joinUrl}
                  </div>
                  <Button variant="secondary" onClick={copyLink} icon={<Copy size={16} />}>
                    Copy link
                  </Button>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="mb-3 text-h3 text-gray-900 dark:text-slate-100">Thành viên đã mời</h2>
              <div className="space-y-2">
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-lg px-3 py-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-200">
                      {p.name[0]?.toUpperCase()}
                    </div>
                    <span className="flex-1 text-body text-gray-800 dark:text-slate-100">{p.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-caption font-medium ${roleLabels[p.role].color}`}>
                      {roleLabels[p.role].label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <Input
                  placeholder="Thêm email hoặc tên..."
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addParticipant()}
                  leftIcon={<UserPlus size={16} />}
                />
                <Button variant="ghost" onClick={addParticipant} className="mt-2 w-full" icon={<Plus size={16} />}>
                  Thêm thành viên
                </Button>
              </div>
            </Card>

            <Button onClick={startMeeting} className="w-full" size="lg" icon={<ArrowRight size={18} />}>
              Vào phòng họp ({participants.length} người)
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CreateMeeting;
