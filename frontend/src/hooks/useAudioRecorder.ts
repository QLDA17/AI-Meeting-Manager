import { useState, useRef, useCallback, useEffect } from "react";
import api from "../services/api";

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

interface LiveTranscript {
  id: string;
  text: string;
  segments: TranscriptSegment[];
  timestamp: number;
}

interface UseAudioRecorderReturn {
  isRecording: boolean;
  liveTranscripts: LiveTranscript[];
  fullTranscript: string;
  allSegments: TranscriptSegment[];
  startRecording: () => void;
  stopRecording: () => void;
  finalize: (meetingId: string) => Promise<any>;
  error: string | null;
}

const CHUNK_INTERVAL_SECONDS = 5;

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
  const fullTranscriptRef = useRef("");
  const allSegmentsRef = useRef<TranscriptSegment[]>([]);
  const sampleRateRef = useRef(16000);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
    };
  }, []);

  const sendChunkToBackend = useCallback(
    async (blob: Blob, chunkIndex: number) => {
      if (!meetingId) return;

      pendingChunksRef.current++;
      const maxRetries = 3;
      const formData = new FormData();
      formData.append("audio", blob, `chunk_${chunkIndex}.wav`);

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

          const { text, segments } = response.data;

          if (text && text.trim()) {
            const transcript: LiveTranscript = {
              id: `chunk_${chunkIndex}_${Date.now()}`,
              text: text.trim(),
              segments: segments || [],
              timestamp: Date.now(),
            };

            setLiveTranscripts((prev) => [...prev, transcript]);
            setFullTranscript((prev) => {
              const newVal = prev ? `${prev}\n${text.trim()}` : text.trim();
              fullTranscriptRef.current = newVal;
              return newVal;
            });
            setAllSegments((prev) => {
              const newVal = [...prev, ...(segments || [])];
              allSegmentsRef.current = newVal;
              return newVal;
            });
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
      pendingChunksRef.current--;
    },
    [meetingId]
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
      highpass.frequency.value = 300;
      highpass.Q.value = 0.7;

      // AudioWorkletNode for PCM capture
      const workletNode = new AudioWorkletNode(audioContext, "audio-processor");

      workletNode.port.onmessage = (event) => {
        const pcmSamples = event.data as Float32Array;
        const chunkIndex = chunkCounterRef.current++;
        const wavBlob = encodeWAV(pcmSamples, sampleRateRef.current);
        sendChunkToBackend(wavBlob, chunkIndex);
      };

      // Connect: source -> highpass -> workletNode
      source.connect(highpass);
      highpass.connect(workletNode);

      audioContextRef.current = audioContext;
      sourceNodeRef.current = source;
      filterNodeRef.current = highpass;
      workletNodeRef.current = workletNode;

      setIsRecording(true);
      console.log(
        `AudioWorklet recording started, chunking every ${CHUNK_INTERVAL_SECONDS}s at ${audioContext.sampleRate}Hz`
      );
    } catch (err: any) {
      console.error("Failed to start AudioWorklet recording:", err);
      setError(`Failed to start recording: ${err.message}`);
    }
  }, [localStream, sendChunkToBackend]);

  const stopRecording = useCallback(() => {
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
  }, []);

  const finalize = useCallback(
    async (finalizeMeetingId: string) => {
      try {
        stopRecording();

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

  return {
    isRecording,
    liveTranscripts,
    fullTranscript,
    allSegments,
    startRecording,
    stopRecording,
    finalize,
    error,
  };
}
