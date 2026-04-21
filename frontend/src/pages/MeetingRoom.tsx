/**
 * MeetingRoom v3 - Scalable & Premium AI Meeting Experience
 * Support for large numbers of participants with Spotlight & Grid modes
 */
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  Check,
  UserPlus,
  Send,
  X,
  FileText,
  ListChecks,
  Target,
  Sparkles,
  LayoutGrid,
  Maximize2,
  MoreVertical
} from "lucide-react";
import { showToast } from "../components/ui";
import { useWebSocket } from "../hooks";
import { useAuth } from "../context/AuthContext";
import { useAppStore } from "../stores";
import { clsx } from "clsx";

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

type SidePanel = "chat" | "participants" | "ai-notes" | null;

// ─── Mock Data ───────────────────────────────────────────────────────────────

const WAVEFORM_HEIGHTS = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0].map(() => Math.random() * 40 + 10);

const MOCK_PARTICIPANTS: Omit<Participant, "id">[] = Array.from({ length: 12 }, (_, i) => ({
  name: `Thành viên ${i + 1}`,
  role: i === 0 ? "presenter" : "attendee",
  micOn: Math.random() > 0.3,
  cameraOn: Math.random() > 0.5,
  handRaised: false,
  isSpeaking: false,
}));

const MOCK_TRANSCRIPTS = [
  { speaker: "Bạn", text: "Chào mọi người, chúng ta bắt đầu buổi review nhé." },
  { speaker: "Thành viên 1", text: "Tôi đã hoàn thành phần thiết kế UI cho trang chủ." },
  { speaker: "Thành viên 2", text: "Phần backend API cũng đã sẵn sàng để tích hợp." },
  { speaker: "Thành viên 1", text: "Cần lưu ý về độ trễ khi load ảnh từ storage server." },
  { speaker: "Bạn", text: "Đúng rồi, chúng ta cần tối ưu lại CDN." },
];

const MOCK_AI_NOTES = {
  keyPoints: [
    "Thiết kế UI trang chủ đã hoàn tất",
    "Backend API sẵn sàng tích hợp",
    "Phát hiện vấn đề độ trễ khi tải ảnh",
    "Cần tối ưu hóa CDN cho Storage"
  ],
  decisions: [
    "Tích hợp API vào UI trong tuần này",
    "Chốt sử dụng Cloudflare làm CDN chính"
  ],
  actionItems: [
    { id: 'a1', task: "Tối ưu hóa CDN", owner: "Thành viên 2", deadline: "Thứ 5", status: "pending" as const },
    { id: 'a2', task: "Kiểm tra độ trễ Storage", owner: "Bạn", deadline: "Thứ 4", status: "pending" as const }
  ],
  summary: "Buổi họp tập trung vào việc review tiến độ UI/UX và Backend. Team quyết định tối ưu CDN để giải quyết vấn đề load ảnh.",
};

// ─── Helper Components ───────────────────────────────────────────────────────

/**
 * Specialized Video Component to prevent flickering/jitter
 * Ensures srcObject is only assigned when the stream actually changes
 */
const VideoView: React.FC<{ 
  stream: MediaStream | null; 
  muted?: boolean; 
  mirror?: boolean;
  className?: string;
  objectFit?: 'cover' | 'contain';
}> = ({ stream, muted = false, mirror = false, className = "", objectFit = 'cover' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => console.log("Video play error:", e));
      }
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={clsx("h-full w-full", className, objectFit === 'cover' ? 'object-cover' : 'object-contain')}
      style={mirror ? { transform: 'scaleX(-1)' } : undefined}
    />
  );
};

/**
 * Isolated Timer component to prevent re-rendering the whole MeetingRoom
 */
const RecordingTimer: React.FC<{ isRecording: boolean }> = ({ isRecording }) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => setSeconds(s => s + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [isRecording]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
      <span className="text-xs font-black font-mono text-red-400">REC {formatTime(seconds)}</span>
    </div>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

const MeetingRoom: React.FC = () => {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  const { meetings } = useAppStore();
  
  const meeting = useMemo(() => {
    if (!code) return null;
    return (meetings as any[]).find(m => m.code === code || m.id === code) || null;
  }, [code, meetings]);

  const [isRecording] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [sidePanel, setSidePanel] = useState<SidePanel>("ai-notes");
  const [, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mainView, setMainView] = useState<"camera" | "screen">("camera");
  
  const [participants] = useState<Participant[]>(() => [
    { id: "me", name: "", role: "organizer", micOn: true, cameraOn: true, handRaised: false },
    ...MOCK_PARTICIPANTS.map((p, i) => ({ ...p, id: `p-${i}` }))
  ]);

  const [spotlightId, setSpotlightId] = useState<string>("me");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { status: wsStatus, connect, disconnect } = useWebSocket();

  const spotlightParticipant = useMemo(() => 
    participants.find(p => p.id === spotlightId) || participants[0]
  , [participants, spotlightId]);

  const galleryParticipants = useMemo(() => 
    participants.filter(p => p.id !== spotlightId)
  , [participants, spotlightId]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720, facingMode: 'user' }, 
          audio: true 
        });
        setLocalStream(stream);
        setCameraOn(true);
        setMicOn(true);
        showToast.success("Camera đã sẵn sàng!");
      } catch (err) {
        console.error("Camera error:", err);
        setCameraOn(false);
        setMicOn(true);
        showToast.error("Camera bị từ chối.");
      }
    };
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) videoTrack.enabled = cameraOn;
    }
  }, [cameraOn, localStream]);

  useEffect(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = micOn;
    }
  }, [micOn, localStream]);

  const toggleScreenShare = async () => {
    if (screenSharing) {
      screenStream?.getTracks().forEach(t => t.stop());
      setScreenStream(null);
      setScreenSharing(false);
      setMainView("camera");
      showToast.info("Đã dừng chia sẻ màn hình");
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: { cursor: "always" } as any,
          audio: false 
        });
        stream.getVideoTracks()[0].onended = () => {
          setScreenStream(null);
          setScreenSharing(false);
          setMainView("camera");
        };
        setScreenStream(stream);
        setScreenSharing(true);
        setMainView("screen");
        showToast.success("Đang chia sẻ màn hình");
      } catch (err) {
        console.error("Screen share error:", err);
        showToast.error("Không thể chia sẻ màn hình");
      }
    }
  };

  const leaveMeeting = () => {
    localStream?.getTracks().forEach(t => t.stop());
    screenStream?.getTracks().forEach(t => t.stop());
    navigate("/meetings");
  };

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { id: Date.now().toString(), sender: "Bạn", text: chatInput, timestamp: Date.now() }]);
    setChatInput("");
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#020617] text-slate-100 overflow-hidden font-sans">
      <header className="h-16 flex items-center justify-between px-6 bg-[#020617]/80 backdrop-blur-md border-b border-slate-800/50 z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">{meeting?.title || 'Cuộc họp'}</h1>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold ${localStream ? 'text-green-400' : 'text-red-400'}`}>
                {localStream ? '● Camera sẵn sàng' : '○ Đang khởi camera...'}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mã: {code}</span>
              <div className="h-1 w-1 rounded-full bg-slate-700" />
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-black uppercase tracking-tighter">
                <Users size={10} /> {participants.length} Người tham gia
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-900/30 border border-green-500/30">
             <span className={`w-2 h-2 rounded-full ${localStream ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
             <span className="text-xs font-bold text-green-400">{localStream ? 'LIVE' : 'OFFLINE'}</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-900 border border-slate-800">
             <RecordingTimer isRecording={isRecording} />
             <div className="h-4 w-px bg-slate-800" />
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Transcript Live</p>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(window.location.href); showToast.success("Link đã sao chép!"); }} className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-500/20">
            <UserPlus size={18} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <aside className="w-64 border-r border-slate-800/50 bg-[#020617]/50 flex flex-col hidden xl:flex">
          <div className="p-4 border-b border-slate-800/50 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Thành viên khác</span>
            <LayoutGrid size={14} className="text-slate-600" />
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {galleryParticipants.map(p => (
              <div 
                key={p.id} 
                onClick={() => setSpotlightId(p.id)}
                className="group relative aspect-video rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden cursor-pointer hover:border-indigo-500/50 transition-all"
              >
                {p.cameraOn ? (
                   <div className="h-full w-full bg-slate-800" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-slate-800">
                    <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-400">
                      {p.name[0]}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/5 flex items-center gap-2">
                   <span className="text-[9px] font-bold text-white truncate max-w-[80px]">{p.name}</span>
                   {!p.micOn && <MicOff size={10} className="text-red-400" />}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex-1 p-6 relative flex flex-col gap-4">
          <div className="flex-1 relative rounded-[2.5rem] bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl group">
              {spotlightId === 'me' ? (
                localStream ? (
                  <div className="h-full w-full bg-black relative">
                    <VideoView 
                      stream={screenSharing && screenStream && mainView === "screen" ? screenStream : localStream}
                      mirror={!(screenSharing && screenStream && mainView === "screen")}
                      objectFit={screenSharing && screenStream && mainView === "screen" ? 'contain' : 'cover'}
                    />
                    
                    {screenSharing && screenStream && localStream && (
                      <div 
                        onClick={() => setMainView(mainView === "camera" ? "screen" : "camera")}
                        className="absolute bottom-4 right-4 w-48 h-36 rounded-xl overflow-hidden border-2 border-indigo-500/40 shadow-2xl bg-black cursor-pointer hover:border-indigo-500 transition-all z-10 group/pip"
                      >
                        <VideoView 
                          stream={mainView === "screen" ? localStream : screenStream}
                          mirror={mainView === "screen"}
                          objectFit={mainView === "screen" ? 'cover' : 'contain'}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/pip:opacity-100 flex items-center justify-center transition-opacity">
                           <Maximize2 size={16} className="text-white" />
                        </div>
                        <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[8px] text-white">
                          {mainView === "screen" ? "" : "Màn hình"}
                        </div>
                      </div>
                    )}
                    
                    <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/50 rounded-lg text-white text-xs flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${cameraOn ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
                      {cameraOn ? 'Camera bật' : 'Camera tắt'}
                    </div>
                  </div>
                ) : (
                 <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950">
                    <div className="w-32 h-32 rounded-full bg-indigo-500/10 border-4 border-indigo-500/20 flex items-center justify-center mb-6 shadow-2xl">
                       <span className="text-5xl font-black text-indigo-400">{(user?.displayName || user?.email || ' ')[0].toUpperCase()}</span>
                    </div>
                    <h2 className="text-xl font-black tracking-tight text-white">{user?.displayName || user?.email || ''}</h2>
                    <p className="text-sm font-bold text-slate-500 mt-2">Camera đang tắt</p>
                 </div>
                )
              ) : (
               <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950">
                  <div className="w-32 h-32 rounded-full bg-indigo-500/10 border-4 border-indigo-500/20 flex items-center justify-center mb-6 shadow-2xl">
                     <span className="text-5xl font-black text-indigo-400">{spotlightParticipant.name[0]}</span>
                  </div>
                  <h2 className="text-xl font-black tracking-tight text-white">{spotlightParticipant.name}</h2>
                  <p className="text-sm font-bold text-slate-500 mt-2">Đang là diễn giả chính</p>
                  
                  <div className="mt-8 flex items-end gap-1.5 h-12">
                     {WAVEFORM_HEIGHTS.map((h, i) => (
                       <motion.div 
                         key={i}
                         animate={{ height: [10, h, 10] }}
                         transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                         className="w-1.5 bg-indigo-500 rounded-full"
                       />
                     ))}
                  </div>
               </div>
             )}

             <div className="absolute top-6 left-6 flex items-center gap-3">
                <div className="px-4 py-2 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex items-center gap-2">
                   <span className="text-xs font-black text-white">{spotlightParticipant.name}</span>
                   {spotlightParticipant.role === 'organizer' && <span className="px-1.5 py-0.5 rounded-md bg-indigo-500 text-[8px] font-black uppercase">Host</span>}
                </div>
             </div>

             <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-3 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-colors">
                   <Maximize2 size={18} />
                </button>
                <button className="p-3 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-colors">
                   <MoreVertical size={18} />
                </button>
             </div>

             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 p-1.5 rounded-full bg-black/40 backdrop-blur-2xl border border-white/10 shadow-2xl">
                <button onClick={() => setMicOn(!micOn)} className={clsx("p-4 rounded-full transition-all duration-300", micOn ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-red-500 text-white shadow-lg shadow-red-500/40")}>
                  {micOn ? <Mic size={22} /> : <MicOff size={22} />}
                </button>
                <button onClick={() => setCameraOn(!cameraOn)} className={clsx("p-4 rounded-full transition-all duration-300", cameraOn ? "bg-green-600 text-white hover:bg-green-500" : "bg-slate-800 text-white hover:bg-slate-700")}>
                  {cameraOn ? <Video size={22} /> : <VideoOff size={22} />}
                </button>
                <div className="w-px h-8 bg-white/10 mx-1" />
                <button onClick={toggleScreenShare} className={clsx("p-4 rounded-full transition-all", screenSharing ? "bg-indigo-500 text-white" : "bg-slate-800 text-white hover:bg-slate-700")}>
                   <MonitorUp size={22} />
                 </button>
                <button onClick={() => setSidePanel(sidePanel === 'chat' ? null : 'chat')} className={clsx("p-4 rounded-full transition-all", sidePanel === 'chat' ? "bg-indigo-500 text-white" : "bg-slate-800 text-white hover:bg-slate-700")}>
                   <MessageSquare size={22} />
                </button>
                <button onClick={() => setSidePanel(sidePanel === 'ai-notes' ? null : 'ai-notes')} className={clsx("p-4 rounded-full transition-all", sidePanel === 'ai-notes' ? "bg-indigo-500 text-white" : "bg-slate-800 text-white hover:bg-slate-700")}>
                   <Sparkles size={22} />
                </button>
                <div className="w-px h-8 bg-white/10 mx-1" />
                <button onClick={leaveMeeting} className="p-4 rounded-full bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-600/40 transition-all active:scale-95 group/leave">
                   <PhoneOff size={22} className="group-hover/leave:-rotate-[135deg] transition-transform duration-500" />
                </button>
             </div>
          </div>
        </main>

        <AnimatePresence>
          {sidePanel && (
            <motion.aside
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className="w-96 border-l border-slate-800 bg-[#020617] flex flex-col z-30 shadow-2xl"
            >
              <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800">
                <div className="flex items-center gap-2">
                   {sidePanel === 'ai-notes' ? (
                      <><Sparkles className="text-indigo-400" size={18} /> <span className="text-sm font-black uppercase tracking-widest">AI Intelligent Notes</span></>
                   ) : (
                      <><MessageSquare className="text-indigo-400" size={18} /> <span className="text-sm font-black uppercase tracking-widest">Team Conversation</span></>
                   )}
                </div>
                <button onClick={() => setSidePanel(null)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                   <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
                 {sidePanel === 'ai-notes' ? (
                   <>
                      <div className="space-y-4">
                         <div className="flex items-center gap-2 text-indigo-400">
                            <FileText size={16} />
                            <span className="text-xs font-bold uppercase tracking-widest">Tóm tắt nội dung</span>
                         </div>
                         <div className="p-5 rounded-[1.5rem] bg-indigo-500/5 border border-indigo-500/10 text-slate-300 text-sm leading-relaxed">
                            {MOCK_AI_NOTES.summary}
                         </div>
                      </div>
                      <div className="space-y-4">
                         <div className="flex items-center gap-2 text-emerald-400">
                            <Target size={16} />
                            <span className="text-xs font-bold uppercase tracking-widest">Quyết định chốt</span>
                         </div>
                         <div className="space-y-2">
                            {MOCK_AI_NOTES.decisions.map((d, i) => (
                               <div key={i} className="flex gap-3 items-start p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                                  <Check className="text-emerald-500 flex-shrink-0 mt-0.5" size={16} />
                                  <p className="text-sm text-slate-300">{d}</p>
                               </div>
                            ))}
                         </div>
                      </div>
                      <div className="space-y-4">
                         <div className="flex items-center gap-2 text-amber-400">
                            <ListChecks size={16} />
                            <span className="text-xs font-bold uppercase tracking-widest">Việc cần làm</span>
                         </div>
                         <div className="space-y-3">
                            {MOCK_AI_NOTES.actionItems.map((item, i) => (
                               <div key={i} className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex flex-col gap-2">
                                  <p className="text-sm font-bold text-slate-200">{item.task}</p>
                                  <div className="flex items-center justify-between">
                                     <span className="text-[10px] font-bold text-amber-500/80 uppercase">{item.owner}</span>
                                     <span className="text-[10px] font-bold text-slate-500">{item.deadline}</span>
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                   </>
                 ) : (
                   <div className="flex flex-col h-full">
                      <div className="flex-1 space-y-4">
                         {MOCK_TRANSCRIPTS.map((t, i) => (
                            <div key={i} className="flex flex-col gap-1">
                               <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">{t.speaker}</span>
                               <div className="px-4 py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-sm text-slate-300">
                                  {t.text}
                               </div>
                            </div>
                         ))}
                      </div>
                      <div className="pt-6">
                         <form onSubmit={sendChat} className="relative">
                            <input 
                              type="text" 
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              placeholder="Gửi tin nhắn cho mọi người..."
                              className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3.5 text-sm outline-none focus:border-indigo-500 transition-all"
                            />
                            <button className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-xl">
                               <Send size={16} />
                            </button>
                         </form>
                      </div>
                   </div>
                 )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {!sidePanel && spotlightId !== 'me' && (
         <div className="absolute bottom-24 right-8 w-48 aspect-video rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden hidden lg:block z-10">
            <VideoView stream={localStream} mirror={true} />
         </div>
      )}
    </div>
  );
};

export default MeetingRoom;
