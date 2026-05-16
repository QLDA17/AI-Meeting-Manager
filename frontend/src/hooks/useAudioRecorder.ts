import { useState, useRef, useCallback, useEffect } from "react";
import api from "../services/api";

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
  language?: string;
  confidence?: number;
}

interface LiveTranscript {
  id: string;
  chunkIndex: number;
  text: string;
  segments: TranscriptSegment[];
  timestamp: number;
}

interface WorkletChunkMessage {
  type: "chunk";
  samples: Float32Array;
  startMs: number;
  endMs: number;
  reason: string;
}

interface UseAudioRecorderReturn {
  isRecording: boolean;
  liveTranscripts: LiveTranscript[];
  fullTranscript: string;
  allSegments: TranscriptSegment[];
  startRecording: () => void;
  stopRecording: () => Promise<void>;
  finalize: (meetingId: string, language?: string) => Promise<any>;
  hydrateDraft: (meetingId: string) => Promise<void>;
  error: string | null;
}

const MAX_CHUNK_SECONDS = 8;
const SILENCE_THRESHOLD = 0.008;
const MIN_SPEECH_SECONDS = 0.3;
const PRE_ROLL_MS = 300;
const HANGOVER_MS = 1500;

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
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

  // RIFF header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  // fmt sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // sub-chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // PCM samples (float32 -> int16)
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export function useAudioRecorder(
  localStream: MediaStream | null,
  meetingId: string | null
): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscripts, setLiveTranscripts] = useState<LiveTranscript[]>([]);
  const [fullTranscript, setFullTranscript] = useState("");
  const [allSegments, setAllSegments] = useState<TranscriptSegment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const chunkCounterRef = useRef(0);
  const pendingChunksRef = useRef(0);
  const flushResolverRef = useRef<(() => void) | null>(null);
  const fullTranscriptRef = useRef("");
  const allSegmentsRef = useRef<TranscriptSegment[]>([]);
  const chunksByIndexRef = useRef<Map<number, LiveTranscript>>(new Map());
  const segmentsByIndexRef = useRef<Map<number, TranscriptSegment[]>>(new Map());
  const sampleRateRef = useRef(16000);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
    };
  }, []);

  const rebuildTranscriptState = useCallback(() => {
    const orderedTranscripts = Array.from(chunksByIndexRef.current.values()).sort(
      (a, b) => a.chunkIndex - b.chunkIndex
    );
    const orderedSegments = Array.from(segmentsByIndexRef.current.entries())
      .sort(([a], [b]) => a - b)
      .flatMap(([, segments]) => segments);
    const nextFullTranscript = orderedTranscripts.map((item) => item.text).join("\n");

    fullTranscriptRef.current = nextFullTranscript;
    allSegmentsRef.current = orderedSegments;
    setLiveTranscripts(orderedTranscripts);
    setFullTranscript(nextFullTranscript);
    setAllSegments(orderedSegments);
  }, []);

  const sendChunkToBackend = useCallback(
    async (blob: Blob, chunkIndex: number, startMs: number) => {
      if (!meetingId) return;

      pendingChunksRef.current++;
      const maxRetries = 3;
      const formData = new FormData();
      formData.append("audio", blob, `chunk_${chunkIndex}.wav`);
      formData.append("chunk_index", String(chunkIndex));
      formData.append("start_ms", String(startMs || 0));

      try {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const response = await api.post(
              `/api/meetings/${meetingId}/transcribe-chunk`,
              formData,
              {
                headers: { "Content-Type": "multipart/form-data" },
                timeout: 120000,
              }
            );

            const { text, segments, language } = response.data;

            if (text && text.trim()) {
              const normalizedSegments = (segments || []).map((segment: TranscriptSegment) => ({
                ...segment,
                start: segment.start + startMs / 1000,
                end: segment.end + startMs / 1000,
                language: segment.language || language || "auto",
              }));
              const transcript: LiveTranscript = {
                id: `chunk_${chunkIndex}_${Date.now()}`,
                chunkIndex,
                text: text.trim(),
                segments: normalizedSegments,
                timestamp: Date.now(),
              };

              chunksByIndexRef.current.set(chunkIndex, transcript);
              segmentsByIndexRef.current.set(chunkIndex, normalizedSegments);
              rebuildTranscriptState();
            }
            break;
          } catch (err: any) {
            const isLastAttempt = attempt === maxRetries;
            console.error(
              `Chunk ${chunkIndex} transcription failed (attempt ${attempt}/${maxRetries}):`,
              err
            );
            if (isLastAttempt) {
              setError(
                `Chunk ${chunkIndex} failed after ${maxRetries} attempts: ${err.response?.data?.detail || err.message}`
              );
            } else {
              await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
            }
          }
        }
      } finally {
        pendingChunksRef.current--;
      }
    },
    [meetingId, rebuildTranscriptState]
  );

  const startRecording = useCallback(async () => {
    if (!localStream) {
      setError("No audio stream available");
      return;
    }

    setError(null);
    chunkCounterRef.current = 0;
    fullTranscriptRef.current = "";
    allSegmentsRef.current = [];
    chunksByIndexRef.current.clear();
    segmentsByIndexRef.current.clear();
    setLiveTranscripts([]);
    setFullTranscript("");
    setAllSegments([]);

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate: 16000 });
      sampleRateRef.current = audioContext.sampleRate;

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      // Load AudioWorklet processor
      await audioContext.audioWorklet.addModule("/audio-processor.js");

      const source = audioContext.createMediaStreamSource(localStream);

      // Highpass filter for noise reduction
      const highpass = audioContext.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 80;
      highpass.Q.value = 0.7;

      // AudioWorkletNode for PCM capture
      const workletNode = new AudioWorkletNode(audioContext, "audio-processor");

      workletNode.port.onmessage = (event) => {
        const data = event.data as WorkletChunkMessage;
        if (!data || data.type !== "chunk") return;
        const pcmSamples = data.samples;
        const chunkIndex = chunkCounterRef.current++;
        const wavBlob = encodeWAV(pcmSamples, sampleRateRef.current);
        sendChunkToBackend(wavBlob, chunkIndex, data.startMs || 0);
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
          maxChunkSeconds: MAX_CHUNK_SECONDS,
          preRollMs: PRE_ROLL_MS,
          hangoverMs: HANGOVER_MS,
        },
      });

      // Connect: source -> highpass -> workletNode
      source.connect(highpass);
      highpass.connect(workletNode);

      audioContextRef.current = audioContext;
      sourceNodeRef.current = source;
      filterNodeRef.current = highpass;
      workletNodeRef.current = workletNode;

      setIsRecording(true);
      console.log(
        `AudioWorklet recording started, VAD max chunk ${MAX_CHUNK_SECONDS}s at ${audioContext.sampleRate}Hz`
      );
    } catch (err: any) {
      console.error("Failed to start AudioWorklet recording:", err);
      setError(`Failed to start recording: ${err.message}`);
    }
  }, [localStream, sendChunkToBackend]);

  const flushRecording = useCallback(async () => {
    if (!workletNodeRef.current) return;

    await new Promise<void>((resolve) => {
      const timer = window.setTimeout(() => {
        if (flushResolverRef.current) {
          flushResolverRef.current = null;
          resolve();
        }
      }, 1200);
      flushResolverRef.current = () => {
        window.clearTimeout(timer);
        resolve();
      };
      workletNodeRef.current?.port.postMessage({ type: "flush" });
    });
  }, []);

  const stopRecording = useCallback(async () => {
    await flushRecording();

    // Disconnect worklet node
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    // Disconnect source
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (filterNodeRef.current) {
      filterNodeRef.current.disconnect();
      filterNodeRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsRecording(false);
    console.log("Recording stopped");
  }, [flushRecording]);

  const finalize = useCallback(
    async (finalizeMeetingId: string, language?: string) => {
      try {
        await stopRecording();

        // Wait for all pending chunks to finish (max 60s)
        const maxWait = 60000;
        const startTime = Date.now();
        while (pendingChunksRef.current > 0 && Date.now() - startTime < maxWait) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        if (pendingChunksRef.current > 0) {
          console.warn(
            `${pendingChunksRef.current} chunks still pending after ${maxWait / 1000}s`
          );
        }

        const response = await api.post(
          `/api/meetings/${finalizeMeetingId}/finalize`,
          {
            transcript: fullTranscriptRef.current,
            segments: allSegmentsRef.current,
            language: language || "vi",
          },
          { timeout: 120000 }
        );

        return response.data;
      } catch (err: any) {
        console.error("Finalize failed:", err);
        setError(`Finalize failed: ${err.response?.data?.detail || err.message}`);
        throw err;
      }
    },
    [stopRecording]
  );

  const hydrateDraft = useCallback(async (draftMeetingId: string) => {
    try {
      const response = await api.get(`/api/meetings/${draftMeetingId}/transcript-draft`);
      const chunks = Array.isArray(response.data?.chunks) ? response.data.chunks : [];
      chunksByIndexRef.current.clear();
      segmentsByIndexRef.current.clear();

      chunks.forEach((chunk: any) => {
        const chunkIndex = Number(chunk.chunkIndex ?? chunk.chunk_index ?? 0);
        const normalizedSegments = (chunk.segments || []).map((segment: any) => ({
          start: Number(segment.start ?? segment.start_time ?? 0),
          end: Number(segment.end ?? segment.end_time ?? 0),
          text: segment.text || "",
          speaker: segment.speaker || segment.speaker_label || "Speaker_01",
          language: segment.language || chunk.language || "auto",
          confidence: segment.confidence ?? segment.confidence_score,
        }));
        chunksByIndexRef.current.set(chunkIndex, {
          id: chunk.id || `draft_${chunkIndex}`,
          chunkIndex,
          text: chunk.text || "",
          segments: normalizedSegments,
          timestamp: chunk.timestamp ? new Date(chunk.timestamp).getTime() : Date.now(),
        });
        segmentsByIndexRef.current.set(chunkIndex, normalizedSegments);
      });

      rebuildTranscriptState();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Không thể khôi phục transcript nháp");
    }
  }, [rebuildTranscriptState]);

  return {
    isRecording,
    liveTranscripts,
    fullTranscript,
    allSegments,
    startRecording,
    stopRecording,
    finalize,
    hydrateDraft,
    error,
  };
}
