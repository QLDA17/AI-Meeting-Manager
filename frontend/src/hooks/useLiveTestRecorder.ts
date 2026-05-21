import { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";

interface TestTranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
  speaker_label?: string;
  speaker_display_name?: string;
  language?: string;
  confidence?: number;
}

interface TestTranscriptChunk {
  id: string;
  chunkIndex: number;
  text: string;
  segments: TestTranscriptSegment[];
  language: string;
  timestamp: number;
  nlpMetadata?: any;
}

interface TestAiNotes {
  meeting_summary?: string;
  key_points?: string[];
  decisions?: string[];
  action_items?: Array<{ task: string; owner: string; deadline: string }>;
  risks?: string[];
  open_questions?: string[];
  timeline_highlights?: string[];
  speaker_summaries?: string[];
}

interface WorkletChunkMessage {
  type: "chunk";
  samples: Float32Array;
  startMs: number;
  reason: string;
}

interface WorkletPCMMessage {
  type: "pcm";
  buffer: ArrayBuffer;
  sampleRate: number;
}

interface DeferredAudioChunk {
  blob: Blob;
  chunkIndex: number;
}

const MAX_CHUNK_SECONDS = 8;
const VIWHISPER_MAX_CHUNK_SECONDS = 12;
const SILENCE_THRESHOLD = 0.012;
const MIN_SPEECH_SECONDS = 0.4;
const PRE_ROLL_MS = 300;
const HANGOVER_MS = 1200;

type SttStatus = "idle" | "connecting" | "streaming" | "fallback" | "recording" | "processing" | "error" | "closed";

function resolveWebSocketBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  const baseURL = configured || window.location.origin;
  return baseURL.replace(/\/+$/, "").replace(/\/api$/i, "").replace(/^http/, "ws");
}

function getAuthToken(): string {
  const sessionStr = localStorage.getItem("session");
  try {
    return sessionStr ? JSON.parse(sessionStr)?.token || "" : "";
  } catch {
    return "";
  }
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i += 1) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * (bitsPerSample / 8);
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export function useLiveTestRecorder(provider?: string) {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [chunks, setChunks] = useState<TestTranscriptChunk[]>([]);
  const [fullTranscript, setFullTranscript] = useState("");
  const [allSegments, setAllSegments] = useState<TestTranscriptSegment[]>([]);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [aiNotes, setAiNotes] = useState<TestAiNotes | null>(null);
  const [summaryStatus, setSummaryStatus] = useState<string | null>(null);
  const [sttStatus, setSttStatus] = useState<SttStatus>("idle");
  const [nlpMetadata, setNlpMetadata] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const chunkCounterRef = useRef(0);
  const pendingChunksRef = useRef(0);
  const flushResolverRef = useRef<(() => void) | null>(null);
  const sampleRateRef = useRef(16000);
  const chunksRef = useRef<Map<number, TestTranscriptChunk>>(new Map());
  const fullTranscriptRef = useRef("");
  const allSegmentsRef = useRef<TestTranscriptSegment[]>([]);
  const sttSocketRef = useRef<WebSocket | null>(null);
  const fallbackModeRef = useRef(false);
  const intentionalCloseRef = useRef(false);
  const viWhisperQueueRef = useRef<DeferredAudioChunk[]>([]);
  const isViWhisper = provider === "viwhisper";

  const rebuildTranscript = useCallback(() => {
    const ordered = Array.from(chunksRef.current.values()).sort((a, b) => a.chunkIndex - b.chunkIndex);
    const transcript = ordered.map((item) => item.text).filter(Boolean).join("\n");
    const segments = ordered.flatMap((item) => item.segments || []);
    fullTranscriptRef.current = transcript;
    allSegmentsRef.current = segments;
    setChunks(ordered);
    setFullTranscript(transcript);
    setAllSegments(segments);
  }, []);

  const mergeChunk = useCallback((rawChunk: any) => {
    const chunkIndex = Number(rawChunk.chunkIndex ?? rawChunk.chunk_index ?? chunkCounterRef.current++);
    const text = String(rawChunk.text || "").trim();
    if (!text) return;
    const segments = Array.isArray(rawChunk.segments) ? rawChunk.segments : [];
    chunksRef.current.set(chunkIndex, {
      id: rawChunk.id || `test-${chunkIndex}`,
      chunkIndex,
      text,
      segments,
      language: rawChunk.language || "auto",
      timestamp: Date.now(),
      nlpMetadata: rawChunk.nlp_metadata,
    });
    if (rawChunk.nlp_metadata) {
      setNlpMetadata(rawChunk.nlp_metadata);
    }
    setInterimTranscript("");
    rebuildTranscript();
  }, [rebuildTranscript]);

  const sendChunk = useCallback(async (blob: Blob, chunkIndex: number) => {
    pendingChunksRef.current += 1;
    const formData = new FormData();
    formData.append("audio", blob, `test_chunk_${chunkIndex}.wav`);
    formData.append("chunk_index", String(chunkIndex));
    formData.append("language", "vi");
    if (provider) {
      formData.append("provider_name", provider);
    }

    try {
      const response = await api.post("/api/test-stt/transcribe-chunk", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      const text = String(response.data?.text || "").trim();
      if (!text) return;
      mergeChunk({
        id: response.data?.id || `test-${chunkIndex}`,
        chunkIndex,
        text,
        segments: Array.isArray(response.data?.segments) ? response.data.segments : [],
        language: response.data?.language || "auto",
        nlp_metadata: response.data?.nlp_metadata,
      });
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Không STT được chunk test");
    } finally {
      pendingChunksRef.current -= 1;
    }
  }, [mergeChunk, provider]);

  const transcribeDeferredViWhisperChunks = useCallback(async () => {
    const queuedChunks = viWhisperQueueRef.current.splice(0);
    if (!queuedChunks.length) {
      setSttStatus("closed");
      return;
    }

    setIsTranscribing(true);
    setSttStatus("processing");
    setError(null);
    try {
      for (const queuedChunk of queuedChunks) {
        await sendChunk(queuedChunk.blob, queuedChunk.chunkIndex);
      }
    } finally {
      setIsTranscribing(false);
      setSttStatus("closed");
    }
  }, [sendChunk]);

  const startChunkRecording = useCallback(async () => {
    setError(null);
    setAiNotes(null);
    setSummaryStatus(null);
    setNlpMetadata(null);
    setInterimTranscript("");
    chunksRef.current.clear();
    chunkCounterRef.current = 0;
    viWhisperQueueRef.current = [];
    rebuildTranscript();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate: 16000 });
      sampleRateRef.current = audioContext.sampleRate;
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }
      await audioContext.audioWorklet.addModule("/audio-processor.js");

      const source = audioContext.createMediaStreamSource(stream);
      const highpass = audioContext.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 80;
      highpass.Q.value = 0.7;
      const workletNode = new AudioWorkletNode(audioContext, "audio-processor");

      workletNode.port.onmessage = (event) => {
        const data = event.data as WorkletChunkMessage;
        if (!data || data.type !== "chunk") return;
        const chunkIndex = chunkCounterRef.current;
        chunkCounterRef.current += 1;
        const blob = encodeWAV(data.samples, sampleRateRef.current);
        if (isViWhisper) {
          viWhisperQueueRef.current.push({ blob, chunkIndex });
        } else {
          sendChunk(blob, chunkIndex);
        }
        if (data.reason === "manual" && flushResolverRef.current) {
          flushResolverRef.current();
          flushResolverRef.current = null;
        }
      };
      workletNode.port.postMessage({
        type: "config",
        config: {
          silenceThreshold: SILENCE_THRESHOLD,
          minSpeechSeconds: MIN_SPEECH_SECONDS,
          maxChunkSeconds: isViWhisper ? VIWHISPER_MAX_CHUNK_SECONDS : MAX_CHUNK_SECONDS,
          preRollMs: PRE_ROLL_MS,
          hangoverMs: HANGOVER_MS,
        },
      });

      source.connect(highpass);
      highpass.connect(workletNode);
      streamRef.current = stream;
      audioContextRef.current = audioContext;
      sourceNodeRef.current = source;
      filterNodeRef.current = highpass;
      workletNodeRef.current = workletNode;
      setIsRecording(true);
      setSttStatus(isViWhisper ? "recording" : "fallback");
    } catch (err: any) {
      setError(err?.message || "Không mở được microphone");
      setSttStatus("error");
    }
  }, [isViWhisper, rebuildTranscript, sendChunk]);

  const setupStreamingAudio = useCallback(async (ws: WebSocket) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass({ sampleRate: 16000 });
    sampleRateRef.current = audioContext.sampleRate;
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }
    await audioContext.audioWorklet.addModule("/pcm-stream-processor.js");
    ws.send(JSON.stringify({ type: "stt.config", sampleRate: sampleRateRef.current, language: "vi" }));

    const source = audioContext.createMediaStreamSource(stream);
    const highpass = audioContext.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 80;
    highpass.Q.value = 0.7;
    const workletNode = new AudioWorkletNode(audioContext, "pcm-stream-processor");
    workletNode.port.postMessage({ type: "config", frameMs: 200 });
    workletNode.port.onmessage = (event) => {
      const data = event.data as WorkletPCMMessage;
      if (!data || data.type !== "pcm") return;
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data.buffer);
      }
    };

    source.connect(highpass);
    highpass.connect(workletNode);
    streamRef.current = stream;
    audioContextRef.current = audioContext;
    sourceNodeRef.current = source;
    filterNodeRef.current = highpass;
    workletNodeRef.current = workletNode;
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setAiNotes(null);
    setSummaryStatus(null);
    setNlpMetadata(null);
    setInterimTranscript("");
    setSttStatus("connecting");
    fallbackModeRef.current = false;
    intentionalCloseRef.current = false;
    chunksRef.current.clear();
    chunkCounterRef.current = 0;
    viWhisperQueueRef.current = [];
    rebuildTranscript();

    // If custom provider, skip WebSocket streaming and use chunk-based recording.
    if (provider) {
      fallbackModeRef.current = true;
      setSttStatus(isViWhisper ? "recording" : "fallback");
      await startChunkRecording();
      return;
    }

    const wsUrl = `${resolveWebSocketBaseUrl()}/api/test-stt/stream?token=${encodeURIComponent(getAuthToken())}`;
    let ws = new WebSocket(wsUrl);
    sttSocketRef.current = ws;
    let resolveStart: (() => void) | null = null;
    let currentWs = ws;

    const startFallback = async (message?: string) => {
      if (fallbackModeRef.current) return;
      fallbackModeRef.current = true;
      try { currentWs.close(); } catch {}
      setSttStatus("fallback");
      await startChunkRecording();
      if (message) setError(message);
    };

    const bindWsHandlers = (socket: WebSocket) => {
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "stt.status") {
            setSttStatus(data.status || "streaming");
            if (data.status === "fallback") {
              startFallback("Realtime STT chưa khả dụng, đang dùng fallback silence-only.");
            } else if (data.status === "error") {
              setError(data.error || "Realtime STT lỗi");
              startFallback(`STT streaming lỗi: ${data.error}. Đang dùng fallback.`);
            }
          } else if (data.type === "test_stt.interim") {
            setInterimTranscript(String(data.text || ""));
          } else if (data.type === "test_stt.final") {
            mergeChunk(data);
          }
        } catch (err) {
          console.error("Failed to parse test STT event:", err);
        }
      };

      socket.onclose = (event) => {
        if (intentionalCloseRef.current) return;
        if (!fallbackModeRef.current) {
          console.warn(`Test STT WebSocket closed unexpectedly (code=${event.code})`);
          startFallback("Kết nối realtime STT bị gián đoạn, chuyển sang fallback.");
        }
      };
    };

    let retriedOnce = false;
    const handleError = () => {
      if (!retriedOnce) {
        retriedOnce = true;
        console.log("Retrying test STT WebSocket once...");
        try { currentWs.close(); } catch {}
        const retryWs = new WebSocket(wsUrl);
        currentWs = retryWs;
        sttSocketRef.current = retryWs;
        bindWsHandlers(retryWs);
        retryWs.onerror = handleError;
        retryWs.onopen = async () => {
          ws = retryWs;
          window.clearTimeout(timer);
          try {
            await setupStreamingAudio(retryWs);
            setIsRecording(true);
            setSttStatus("streaming");
          } catch (err: any) {
            await startFallback(err.message || "Không khởi tạo được realtime STT.");
          }
          resolveStart?.();
        };
      } else {
        startFallback("Không nối được realtime STT, đang dùng fallback silence-only.").finally(() => {
          resolveStart?.();
        });
      }
    };
    ws.onerror = handleError;
    bindWsHandlers(ws);

    let timer: number;
    await new Promise<void>((resolve) => {
      resolveStart = resolve;
      timer = window.setTimeout(() => {
        startFallback("Realtime STT timeout, đang dùng fallback silence-only.").finally(resolve);
      }, 3000);
      ws.onopen = async () => {
        window.clearTimeout(timer);
        try {
          await setupStreamingAudio(ws);
          setIsRecording(true);
          setSttStatus("streaming");
        } catch (err: any) {
          await startFallback(err.message || "Không khởi tạo được realtime STT.");
        }
        resolve();
      };
    });
  }, [isViWhisper, mergeChunk, rebuildTranscript, setupStreamingAudio, startChunkRecording, provider]);

  const flushRecording = useCallback(async () => {
    if (!workletNodeRef.current) return;
    await new Promise<void>((resolve) => {
      const timer = window.setTimeout(() => {
        flushResolverRef.current = null;
        resolve();
      }, 1200);
      flushResolverRef.current = () => {
        window.clearTimeout(timer);
        resolve();
      };
      workletNodeRef.current?.port.postMessage({ type: "flush" });
    });
  }, []);

  const stopRecording = useCallback(async () => {
    intentionalCloseRef.current = true;

    const shouldTranscribeDeferredViWhisper = fallbackModeRef.current && isViWhisper;

    if (fallbackModeRef.current) {
      await flushRecording();
    } else if (sttSocketRef.current?.readyState === WebSocket.OPEN) {
      const ws = sttSocketRef.current;
      ws.send(JSON.stringify({ type: "stt.finalize" }));
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 3000);
        const onMsg = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "stt.status" && data.status === "closed") {
              clearTimeout(timeout);
              ws.removeEventListener("message", onMsg);
              resolve();
            }
          } catch {}
        };
        ws.addEventListener("message", onMsg);
      });
      try {
        ws.send(JSON.stringify({ type: "stt.close" }));
        await new Promise((r) => setTimeout(r, 200));
      } catch {}
    }

    try { sttSocketRef.current?.close(); } catch {}
    sttSocketRef.current = null;
    workletNodeRef.current?.disconnect();
    sourceNodeRef.current?.disconnect();
    filterNodeRef.current?.disconnect();
    workletNodeRef.current = null;
    sourceNodeRef.current = null;
    filterNodeRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      await audioContextRef.current.close();
    }
    audioContextRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setIsRecording(false);
    setInterimTranscript("");
    setSttStatus(shouldTranscribeDeferredViWhisper ? "processing" : fallbackModeRef.current ? "fallback" : "closed");

    if (shouldTranscribeDeferredViWhisper) {
      await transcribeDeferredViWhisperChunks();
    }
  }, [flushRecording, isViWhisper, transcribeDeferredViWhisperChunks]);

  const analyze = useCallback(async () => {
    await stopRecording();
    const started = Date.now();
    while (pendingChunksRef.current > 0 && Date.now() - started < 60000) {
      await new Promise((resolve) => window.setTimeout(resolve, 200));
    }
    const transcript = fullTranscriptRef.current.trim();
    const segments = allSegmentsRef.current;
    if (!transcript) {
      setError("Chưa có transcript để tạo AI Notes");
      return null;
    }
    setIsAnalyzing(true);
    setSummaryStatus("PROCESSING");
    setError(null);
    try {
      const response = await api.post("/api/test-stt/analyze", {
        transcript,
        segments,
        language: "vi",
      }, { timeout: 120000 });
      setAiNotes(response.data?.summary || null);
      setSummaryStatus(response.data?.summary_status || "COMPLETED");
      if (response.data?.nlp_metadata) {
        setNlpMetadata(response.data.nlp_metadata);
      }
      return response.data;
    } catch (err: any) {
      setSummaryStatus("FAILED");
      setError(err?.response?.data?.detail || err.message || "Không tạo được AI Notes");
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [stopRecording]);

  const reset = useCallback(async () => {
    await stopRecording();
    chunksRef.current.clear();
    viWhisperQueueRef.current = [];
    sttSocketRef.current?.close();
    sttSocketRef.current = null;
    fullTranscriptRef.current = "";
    allSegmentsRef.current = [];
    setChunks([]);
    setFullTranscript("");
    setAllSegments([]);
    setAiNotes(null);
    setSummaryStatus(null);
    setInterimTranscript("");
    setSttStatus("idle");
    setIsTranscribing(false);
    setNlpMetadata(null);
    setError(null);
  }, [stopRecording]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      sttSocketRef.current?.close();
      workletNodeRef.current?.disconnect();
      sourceNodeRef.current?.disconnect();
      filterNodeRef.current?.disconnect();
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    isRecording,
    isAnalyzing,
    isTranscribing,
    chunks,
    fullTranscript,
    allSegments,
    interimTranscript,
    aiNotes,
    summaryStatus,
    sttStatus,
    nlpMetadata,
    error,
    startRecording,
    stopRecording,
    analyze,
    reset,
  };
}
