/**
 * MeetingRoom - Phòng họp trực tuyến kiểu Google Meet với AI ghi biên bản
 * Hỗ trợ: Camera, Micro, Chia sẻ màn hình, Chat, Transcript real-time, AI Summary
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MonitorUp,
  MessageSquare,
  Users,
  Settings,
  Copy,
  Check,
  Circle,
  UserPlus,
  Hand,
  Send,
  Bot,
  X,
  FileText,
  ListChecks,
  Target,
  Key,
  Sparkles,
} from "lucide-react";
import { Button, Tooltip, showToast } from "../components/ui";
import { useWebSocket } from "../hooks";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Participant {
  id: string;
  name: string;
  role: "organizer" | "presenter" | "attendee";
  stream?: MediaStream | null;
  micOn: boolean;
  cameraOn: boolean;
  handRaised: boolean;
  isSpeaking?: boolean;
}

interface ChatMsg {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

interface ActionItem {
  id: string;
  task: string;
  owner: string;
  deadline: string;
  status: "pending" | "done";
}

type SidePanel = "chat" | "participants" | "ai-notes" | null;

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_PARTICIPANTS: Omit<Participant, "id">[] = [
  { name: "Nguyễn Văn A", role: "organizer", micOn: true, cameraOn: true, handRaised: false, isSpeaking: false },
  { name: "Trần Thị B", role: "presenter", micOn: true, cameraOn: true, handRaised: false, isSpeaking: false },
  { name: "Phạm Văn C", role: "attendee", micOn: true, cameraOn: false, handRaised: false, isSpeaking: false },
  { name: "Hoàng Thị D", role: "attendee", micOn: false, cameraOn: true, handRaised: false, isSpeaking: false },
];

const MOCK_TRANSCRIPTS = [
  { speaker: "Nguyễn Văn A", text: "Chào mọi người, hôm nay chúng ta sẽ review tiến độ sprint 2 và lên kế hoạch cho sprint 3." },
  { speaker: "Trần Thị B", text: "Team đã hoàn thành 80% task trong sprint 2. Còn 3 task về API authentication đang chờ review." },
  { speaker: "Phạm Văn C", text: "Em sẽ hoàn thành API auth trước thứ 6. Hiện tại đang test phần JWT token refresh." },
  { speaker: "Nguyễn Văn A", text: "Tốt. Vậy chúng ta chốt deadline là thứ 6. Có ai có ý kiến gì không?" },
  { speaker: "Hoàng Thị D", text: "Em đề xuất thêm phần unit test cho module auth, để đảm bảo coverage trên 80%." },
  { speaker: "Trần Thị B", text: "Đồng ý. Em sẽ phân công task viết unit test cho bạn C." },
  { speaker: "Nguyễn Văn A", text: "OK, chốt: 1) API auth xong trước thứ 6. 2) Thêm unit test coverage > 80%. 3) Sprint 3 bắt đầu thứ 2." },
  { speaker: "Phạm Văn C", text: "Em cũng cần thêm người review phần database migration. Ai rảnh hỗ trợ em với?" },
  { speaker: "Hoàng Thị D", text: "Em có thể review giúp anh C. Gửi em PR trước thứ 4 nhé." },
  { speaker: "Nguyễn Văn A", text: "Tuyệt. Vậy chốt thêm: D review migration PR cho C trước thứ 4. Mọi người còn gì không?" },
];

const MOCK_AI_NOTES = {
  keyPoints: [
    "Sprint 2 đã hoàn thành 80%, còn 3 task API authentication pending",
    "Deadline hoàn thành API auth: thứ 6",
    "Yêu cầu unit test coverage > 80% cho module auth",
    "Sprint 3 bắt đầu từ thứ 2",
    "Hoàng Thị D sẽ review database migration PR cho Phạm Văn C trước thứ 4",
  ],
  decisions: [
    "API authentication phải hoàn thành trước thứ 6",
    "Unit test coverage tối thiểu 80% cho module auth",
    "Sprint 3 starts vào thứ 2 tuần tới",
    "Hoàng Thị D được phân công review migration PR",
  ],
  actionItems: [
    { id: 'action-1', task: "Hoàn thành API authentication", owner: "Phạm Văn C", deadline: "Thứ 6", status: "pending" as const, meetingId: 'mock', groupId: 'mock', orgId: 'mock', title: 'Hoàn thành API authentication', assignedTo: 'user-c', assignedBy: 'user-a', dueDate: new Date(), createdAt: new Date(), updatedAt: new Date() },
    { id: 'action-2', task: "Viết unit test coverage > 80%", owner: "Phạm Văn C", deadline: "Thứ 6", status: "pending" as const, meetingId: 'mock', groupId: 'mock', orgId: 'mock', title: 'Viết unit test coverage > 80%', assignedTo: 'user-c', assignedBy: 'user-a', dueDate: new Date(), createdAt: new Date(), updatedAt: new Date() },
    { id: 'action-3', task: "Gửi PR database migration", owner: "Phạm Văn C", deadline: "Thứ 4", status: "pending" as const, meetingId: 'mock', groupId: 'mock', orgId: 'mock', title: 'Gửi PR database migration', assignedTo: 'user-c', assignedBy: 'user-a', dueDate: new Date(), createdAt: new Date(), updatedAt: new Date() },
    { id: 'action-4', task: "Review migration PR", owner: "Hoàng Thị D", deadline: "Thứ 4", status: "pending" as const, meetingId: 'mock', groupId: 'mock', orgId: 'mock', title: 'Review migration PR', assignedTo: 'user-d', assignedBy: 'user-a', dueDate: new Date(), createdAt: new Date(), updatedAt: new Date() },
    { id: 'action-5', task: "Phân công task unit test", owner: "Trần Thị B", deadline: "Thứ 2", status: "pending" as const, meetingId: 'mock', groupId: 'mock', orgId: 'mock', title: 'Phân công task unit test', assignedTo: 'user-b', assignedBy: 'user-a', dueDate: new Date(), createdAt: new Date(), updatedAt: new Date() },
  ],
  summary: "Cuộc họp review sprint 2 với tiến độ 80% hoàn thành. Team chốt deadline API auth vào thứ 6, yêu cầu unit test coverage trên 80%. Sprint 3 bắt đầu thứ 2. Hoàng Thị D sẽ review database migration PR cho Phạm Văn C.",
};

// ─── Component ───────────────────────────────────────────────────────────────

const MeetingRoom: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { code } = useParams<{ code: string }>();
  const meetingState = location.state as {
    title?: string;
    organizer?: string;
    enableCamera?: boolean;
    enableMic?: boolean;
    enableRecord?: boolean;
    participants?: { id: string; name: string; role: string }[];
  } | null;

  // ── State ────────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(meetingState?.enableRecord ?? true);
  const [micOn, setMicOn] = useState(meetingState?.enableMic ?? true);
  const [cameraOn, setCameraOn] = useState(meetingState?.enableCamera ?? true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [sidePanel, setSidePanel] = useState<SidePanel>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [copied, setCopied] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [aiNotesVisible, setAiNotesVisible] = useState(false);

  // Build participants list: current user + mock participants
  const [participants, setParticipants] = useState<Participant[]>(() => {
    const organizerName = meetingState?.organizer || "Bạn";
    const mockWithIds: Participant[] = MOCK_PARTICIPANTS.map((p, idx) => ({
      ...p,
      id: `mock-${idx + 2}`,
      stream: null,
    }));
    return [
      {
        id: "1",
        name: organizerName,
        role: "organizer",
        micOn,
        cameraOn,
        handRaised: false,
        stream: null,
      },
      ...mockWithIds,
    ];
  });

  // Mock AI data state
  const [mockTranscriptIndex, setMockTranscriptIndex] = useState(0);
  const [aiKeyPoints, setAiKeyPoints] = useState<string[]>([]);
  const [aiDecisions, setAiDecisions] = useState<string[]>([]);
  const [aiActionItems, setAiActionItems] = useState<ActionItem[]>([]);
  const [aiSummary, setAiSummary] = useState("");

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const { transcript, status: wsStatus, connect, disconnect } = useWebSocket();

  // ── Effects ──────────────────────────────────────────────────────────────

  // Start local camera
  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: cameraOn,
          audio: micOn,
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera/mic error:", err);
        showToast.error("Không thể truy cập camera/microphone");
      }
    };
    startCamera();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle camera
  useEffect(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = cameraOn));
    }
  }, [cameraOn, localStream]);

  // Toggle mic
  useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = micOn));
    }
  }, [micOn, localStream]);

  // Recording timer
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  // Connect WebSocket for real-time transcript (if backend available)
  useEffect(() => {
    if (code && isRecording) {
      connect(code);
    }
    return () => {
      disconnect();
    };
  }, [code, isRecording, connect, disconnect]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  // Mock transcript generation (simulates AI processing)
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      if (mockTranscriptIndex < MOCK_TRANSCRIPTS.length) {
        const next = MOCK_TRANSCRIPTS[mockTranscriptIndex];
        // Update AI notes progressively
        const idx = mockTranscriptIndex + 1;
        setAiKeyPoints(MOCK_AI_NOTES.keyPoints.slice(0, Math.ceil(idx / 2)));
        setAiDecisions(MOCK_AI_NOTES.decisions.slice(0, Math.floor(idx / 2)));
        setAiActionItems(MOCK_AI_NOTES.actionItems.slice(0, Math.ceil(idx / 2)));
        if (idx >= MOCK_TRANSCRIPTS.length) {
          setAiSummary(MOCK_AI_NOTES.summary);
          setAiNotesVisible(true);
        }
        setMockTranscriptIndex(idx);
      }
    }, 8000); // New transcript every 8 seconds
    return () => clearInterval(interval);
  }, [isRecording, mockTranscriptIndex]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const leaveMeeting = () => {
    localStream?.getTracks().forEach((t) => t.stop());
    disconnect();
    showToast.info("Đã rời cuộc họp");
    navigate("/meetings");
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
      setScreenSharing(false);
      if (localStream && localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        screenStream.getVideoTracks()[0].onended = () => {
          setScreenSharing(false);
          if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
          }
        };
        setScreenSharing(true);
      } catch {
        showToast.error("Không thể chia sẻ màn hình");
      }
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code || "");
      setCopied(true);
      showToast.success("Đã sao chép mã tham gia!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast.error("Không thể sao chép");
    }
  };

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: meetingState?.organizer || "Bạn", text: chatInput.trim(), timestamp: Date.now() },
    ]);
    setChatInput("");
  };

  const toggleHand = () => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === "1" ? { ...p, handRaised: !p.handRaised } : p
      )
    );
  };

  const togglePanel = (panel: SidePanel) => {
    setSidePanel((prev) => (prev === panel ? null : panel));
  };

  const myHandRaised = participants.find((p) => p.id === "1")?.handRaised;

  // Merge real WebSocket transcripts with mock
  const allTranscripts = transcript.length > 0
    ? transcript.map((t) => ({ speaker: t.speaker, text: t.text, timestamp: t.timestamp }))
    : MOCK_TRANSCRIPTS.slice(0, mockTranscriptIndex).map((t, idx) => ({
        speaker: t.speaker,
        text: t.text,
        timestamp: Date.now() - (mockTranscriptIndex - idx) * 8000,
      }));

  // Video grid calculation
  const activeParticipants = participants.filter((p) => p.cameraOn || p.id === "1");
  const gridCols = activeParticipants.length <= 2 ? 2 : activeParticipants.length <= 4 ? 2 : 3;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white">
      {/* ═══════════ TOP BAR ═══════════ */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2.5">
        {/* Left: Title + Code */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-xs font-bold text-white">
            MM
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">
              {meetingState?.title || "Cuộc họp"}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Mã: {code}</span>
              <button onClick={copyCode} className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300">
                {copied ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          </div>
        </div>

        {/* Center: Recording indicator */}
        <div className="flex items-center gap-3">
          {isRecording && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center gap-2 rounded-full bg-red-900/40 px-3 py-1"
            >
              <Circle size={8} className="fill-red-500 text-red-500" />
              <span className="font-mono text-xs font-medium text-red-400">
                AI ghi âm {formatTime(recordingTime)}
              </span>
            </motion.div>
          )}
          <span className="text-xs text-slate-400">
            {wsStatus === "streaming" ? "● WebSocket" : `${formatTime(recordingTime)}`}
          </span>
        </div>

        {/* Right: Settings */}
        <div className="flex items-center gap-2">
          <Tooltip content="Mời người tham gia">
            <button
              onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/join/${code}`); showToast.success("Đã sao chép link mời!"); }}
              className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <UserPlus size={16} />
            </button>
          </Tooltip>
          <Tooltip content="Cài đặt">
            <button className="rounded-lg p-2 text-slate-300 hover:bg-slate-800 hover:text-white">
              <Settings size={16} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Video Area ─────────────────────────────────────────────────── */}
        <div className="relative flex-1 overflow-hidden">
          <div className={`grid h-full gap-2 p-2 ${
            gridCols === 2 ? "grid-cols-1 sm:grid-cols-2" :
            gridCols === 3 ? "grid-cols-2 lg:grid-cols-3" :
            "grid-cols-2 lg:grid-cols-4"
          }`}>
            {activeParticipants.map((p) => {
              const isLocal = p.id === "1";
              return (
                <div
                  key={p.id}
                  className="relative overflow-hidden rounded-xl bg-slate-800 ring-1 ring-slate-700"
                >
                  {isLocal ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-700">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-xl font-bold text-white">
                        {p.name[0]?.toUpperCase()}
                      </div>
                    </div>
                  )}

                  {/* Camera off overlay */}
                  {(!p.cameraOn || (!isLocal && !p.cameraOn)) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-600 text-xl font-bold text-white">
                        {p.name[0]?.toUpperCase()}
                      </div>
                    </div>
                  )}

                  {/* Name tag */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg bg-black/60 px-2 py-1">
                    <span className="text-xs font-medium text-white">
                      {p.name}{isLocal ? " (bạn)" : ""}
                    </span>
                    {p.handRaised && <Hand size={12} className="text-amber-400" />}
                    {!p.micOn && <MicOff size={12} className="text-red-400" />}
                  </div>

                  {/* Screen sharing badge */}
                  {isLocal && screenSharing && (
                    <div className="absolute top-2 left-2 rounded-lg bg-blue-600 px-2 py-1 text-xs font-medium text-white">
                      Đang chia sẻ màn hình
                    </div>
                  )}

                  {/* Speaking indicator */}
                  {p.isSpeaking && (
                    <div className="absolute top-2 right-2 flex gap-0.5">
                      <div className="h-3 w-0.5 animate-pulse rounded-full bg-green-400" />
                      <div className="h-4 w-0.5 animate-pulse rounded-full bg-green-400" style={{ animationDelay: "100ms" }} />
                      <div className="h-2 w-0.5 animate-pulse rounded-full bg-green-400" style={{ animationDelay: "200ms" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Participant count badge */}
          <div className="absolute top-4 right-4 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
            <Users size={12} className="mr-1 inline" />
            {participants.length} người
          </div>
        </div>

        {/* ── Side Panel ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {sidePanel && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col border-l border-slate-800 bg-slate-900 overflow-hidden"
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  {sidePanel === "chat" && <><MessageSquare size={16} /> Chat</>}
                  {sidePanel === "participants" && <><Users size={16} /> Thành viên ({participants.length})</>}
                  {sidePanel === "ai-notes" && <><Sparkles size={16} className="text-primary-400" /> AI Ghi chú</>}
                </h3>
                <button onClick={() => setSidePanel(null)} className="text-slate-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              {/* ── Chat Panel ─────────────────────────────────────────── */}
              {sidePanel === "chat" && (
                <>
                  <div className="custom-scrollbar flex-1 overflow-y-auto p-4 space-y-3">
                    {/* Real-time Transcript Section */}
                    {allTranscripts.length > 0 && (
                      <div className="mb-4">
                        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary-400">
                          <Bot size={12} /> Transcript AI
                        </h4>
                        <div className="space-y-1.5">
                          {allTranscripts.map((t, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="rounded-lg bg-slate-800 px-3 py-2"
                            >
                              <span className="text-xs font-semibold text-primary-400">
                                {t.speaker}
                              </span>
                              <p className="mt-0.5 text-xs text-slate-300">{t.text}</p>
                            </motion.div>
                          ))}
                          <div ref={transcriptEndRef} />
                        </div>
                      </div>
                    )}

                    {/* Chat Messages */}
                    {chatMessages.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Tin nhắn
                        </h4>
                        {chatMessages.map((msg) => (
                          <div key={msg.id} className="mb-2 rounded-lg bg-slate-800 px-3 py-2">
                            <span className="text-xs font-semibold text-slate-300">{msg.sender}</span>
                            <p className="text-xs text-slate-400">{msg.text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {allTranscripts.length === 0 && chatMessages.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                        <MessageSquare size={32} className="mb-2 opacity-50" />
                        <p className="text-sm">Chưa có tin nhắn hoặc transcript</p>
                        <p className="text-xs">AI sẽ tự động ghi nhận cuộc hội thoại</p>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input */}
                  <form onSubmit={sendChat} className="border-t border-slate-800 p-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Nhập tin nhắn..."
                        className="h-9 w-full rounded-lg border border-slate-700 bg-slate-800 pl-3 pr-10 text-xs text-white placeholder-slate-500 outline-none focus:border-primary-500"
                      />
                      <button
                        type="submit"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-primary-500 p-1.5 text-white hover:bg-primary-600"
                      >
                        <Send size={12} />
                      </button>
                    </div>
                  </form>
                </>
              )}

              {/* ── Participants Panel ─────────────────────────────────── */}
              {sidePanel === "participants" && (
                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-1 p-3">
                    {participants.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-800">
                        <div className="relative">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                            {p.name[0]?.toUpperCase()}
                          </div>
                          {p.handRaised && (
                            <Hand size={10} className="absolute -top-1 -right-1 text-amber-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-white">
                            {p.name}
                            {p.id === "1" && <span className="ml-1 text-slate-500">(bạn)</span>}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {p.role === "organizer" ? "Tổ chức" : p.role === "presenter" ? "Trình bày" : "Tham dự"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!p.micOn && <MicOff size={12} className="text-red-400" />}
                          {!p.cameraOn && <VideoOff size={12} className="text-red-400" />}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-800 p-3">
                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-700 px-3 py-2">
                      <span className="font-mono text-xs text-primary-400">{code}</span>
                      <button onClick={copyCode} className="ml-auto text-xs text-slate-400 hover:text-white">
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── AI Notes Panel ─────────────────────────────────────── */}
              {sidePanel === "ai-notes" && (
                <div className="custom-scrollbar flex-1 overflow-y-auto">
                  {/* AI Summary */}
                  {aiSummary && (
                    <div className="border-b border-slate-800 px-4 py-3">
                      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-primary-400">
                        <FileText size={12} /> Tóm tắt AI
                      </h4>
                      <p className="text-xs leading-relaxed text-slate-300">{aiSummary}</p>
                    </div>
                  )}

                  {/* Key Points */}
                  {aiKeyPoints.length > 0 && (
                    <div className="border-b border-slate-800 px-4 py-3">
                      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-blue-400">
                        <Key size={12} /> Điểm chính ({aiKeyPoints.length})
                      </h4>
                      <div className="space-y-1.5">
                        {aiKeyPoints.map((point, idx) => (
                          <div key={idx} className="flex items-start gap-2 rounded-lg bg-slate-800 px-3 py-2">
                            <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-blue-900/50 text-[10px] font-bold text-blue-300">
                              {idx + 1}
                            </span>
                            <p className="text-xs text-slate-300">{point}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Decisions */}
                  {aiDecisions.length > 0 && (
                    <div className="border-b border-slate-800 px-4 py-3">
                      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-green-400">
                        <Target size={12} /> Quyết định ({aiDecisions.length})
                      </h4>
                      <div className="space-y-1.5">
                        {aiDecisions.map((d, idx) => (
                          <div key={idx} className="flex items-start gap-2 rounded-lg bg-slate-800 px-3 py-2">
                            <Check size={12} className="mt-0.5 flex-shrink-0 text-green-400" />
                            <p className="text-xs text-slate-300">{d}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Items */}
                  {aiActionItems.length > 0 && (
                    <div className="px-4 py-3">
                      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                        <ListChecks size={12} /> Việc cần làm ({aiActionItems.length})
                      </h4>
                      <div className="space-y-2">
                        {aiActionItems.map((item, idx) => (
                          <div key={idx} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5">
                            <p className="text-xs font-medium text-slate-200">{item.task}</p>
                            <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                              <span className="rounded-full bg-primary-900/40 px-2 py-0.5 text-primary-300">
                                {item.owner}
                              </span>
                              <span>{item.deadline}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {aiKeyPoints.length === 0 && aiDecisions.length === 0 && aiActionItems.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                      <Sparkles size={32} className="mb-2 opacity-50" />
                      <p className="text-sm">AI đang phân tích cuộc họp...</p>
                      <p className="text-xs">Ghi chú và tóm tắt sẽ xuất hiện tự động</p>
                    </div>
                  )}
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* ═══════════ BOTTOM CONTROL BAR ═══════════ */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 border-t border-slate-800 bg-slate-900 px-2 py-3 sm:px-4">
        {/* Mic */}
        <Tooltip content={micOn ? "Tắt mic" : "Bật mic"} shortcut="M">
          <button
            onClick={() => setMicOn(!micOn)}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition sm:h-12 sm:w-12 ${
              micOn ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-red-600 text-white hover:bg-red-700"
            }`}
          >
            {micOn ? <Mic size={18} /> : <MicOff size={18} />}
          </button>
        </Tooltip>

        {/* Camera */}
        <Tooltip content={cameraOn ? "Tắt camera" : "Bật camera"} shortcut="V">
          <button
            onClick={() => setCameraOn(!cameraOn)}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition sm:h-12 sm:w-12 ${
              cameraOn ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-red-600 text-white hover:bg-red-700"
            }`}
          >
            {cameraOn ? <Video size={18} /> : <VideoOff size={18} />}
          </button>
        </Tooltip>

        {/* Screen Share */}
        <Tooltip content={screenSharing ? "Dừng chia sẻ" : "Chia sẻ màn hình"} shortcut="S">
          <button
            onClick={toggleScreenShare}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition sm:h-12 sm:w-12 ${
              screenSharing ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-slate-700 text-white hover:bg-slate-600"
            }`}
          >
            <MonitorUp size={18} />
          </button>
        </Tooltip>

        {/* AI Recording */}
        <Tooltip content={isRecording ? "Dừng ghi âm AI" : "Bật ghi âm AI"}>
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition sm:h-12 sm:w-12 ${
              isRecording ? "bg-red-600 text-white hover:bg-red-700" : "bg-slate-700 text-white hover:bg-slate-600"
            }`}
          >
            <Circle size={18} className={isRecording ? "animate-pulse" : ""} />
          </button>
        </Tooltip>

        {/* Raise Hand */}
        <Tooltip content="Giơ tay" shortcut="H">
          <button
            onClick={toggleHand}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition sm:h-12 sm:w-12 ${
              myHandRaised ? "bg-amber-600 text-white hover:bg-amber-700" : "bg-slate-700 text-white hover:bg-slate-600"
            }`}
          >
            <Hand size={18} />
          </button>
        </Tooltip>

        <div className="mx-1 h-8 w-px bg-slate-700 sm:mx-2" />

        {/* Chat & Transcript */}
        <Tooltip content="Chat & Transcript" shortcut="C">
          <button
            onClick={() => togglePanel("chat")}
            className={`relative flex h-11 w-11 items-center justify-center rounded-full transition sm:h-12 sm:w-12 ${
              sidePanel === "chat" ? "bg-primary-600 text-white" : "bg-slate-700 text-white hover:bg-slate-600"
            }`}
          >
            <MessageSquare size={18} />
            {chatMessages.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold">
                {chatMessages.length}
              </span>
            )}
          </button>
        </Tooltip>

        {/* AI Notes */}
        <Tooltip content="AI Ghi chú">
          <button
            onClick={() => togglePanel("ai-notes")}
            className={`relative flex h-11 w-11 items-center justify-center rounded-full transition sm:h-12 sm:w-12 ${
              sidePanel === "ai-notes" ? "bg-primary-600 text-white" : "bg-slate-700 text-white hover:bg-slate-600"
            }`}
          >
            <Sparkles size={18} />
            {aiNotesVisible && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[9px] font-bold">
                AI
              </span>
            )}
          </button>
        </Tooltip>

        {/* Participants */}
        <Tooltip content="Thành viên" shortcut="P">
          <button
            onClick={() => togglePanel("participants")}
            className={`flex h-11 w-11 items-center justify-center rounded-full transition sm:h-12 sm:w-12 ${
              sidePanel === "participants" ? "bg-primary-600 text-white" : "bg-slate-700 text-white hover:bg-slate-600"
            }`}
          >
            <Users size={18} />
          </button>
        </Tooltip>

        <div className="mx-1 h-8 w-px bg-slate-700 sm:mx-2" />

        {/* Leave Meeting */}
        <Tooltip content="Rời phòng">
          <button
            onClick={leaveMeeting}
            className="flex h-11 items-center gap-2 rounded-full bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 sm:h-12 sm:px-5"
          >
            <PhoneOff size={16} />
            <span className="hidden sm:inline">Rời phòng</span>
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default MeetingRoom;
