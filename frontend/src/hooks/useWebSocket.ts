import { useState, useEffect, useCallback, useRef } from "react";

interface TranscriptChunk {
  id: string;
  userId?: string;
  chunkIndex?: number;
  speaker: string;
  text: string;
  timestamp: number;
  segments?: any[];
  isNew?: boolean;
}

interface UseWebSocketReturn {
  transcript: TranscriptChunk[];
  lastEvent: any | null;
  status: "idle" | "connecting" | "streaming" | "done" | "error";
  connect: (meetingId: string) => void;
  sendJson: (payload: any) => boolean;
  disconnect: () => void;
  isConnected: boolean;
  onReconnect: (callback: () => void) => void;
}

function resolveWebSocketBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  const baseURL = configured || window.location.origin;
  return baseURL.replace(/\/+$/, "").replace(/\/api$/i, "").replace(/^http/, "ws");
}

export function useWebSocket(): UseWebSocketReturn {
  const [transcript, setTranscript] = useState<TranscriptChunk[]>([]);
  const [lastEvent, setLastEvent] = useState<any | null>(null);
  const [status, setStatus] = useState<UseWebSocketReturn["status"]>("idle");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const connectRef = useRef<(meetingId: string) => void>(() => {});
  const meetingIdRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);
  const connectionSeqRef = useRef(0);
  const onReconnectRef = useRef<(() => void) | null>(null);

  const MAX_RETRIES = 10;
  const BASE_DELAY = 1000;
  const MAX_DELAY = 15000;

  const connect = useCallback((meetingId: string) => {
    const connectionSeq = connectionSeqRef.current + 1;
    connectionSeqRef.current = connectionSeq;
    const isCurrentConnection = () => (
      connectionSeqRef.current === connectionSeq && meetingIdRef.current === meetingId
    );

    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)
    ) {
      wsRef.current.close(1000, "Replaced by newer connection");
    }

    const isNewMeeting = meetingIdRef.current !== meetingId;
    meetingIdRef.current = meetingId;
    setStatus("connecting");
    if (isNewMeeting) {
      setTranscript([]);
    }

    const wsUrl = resolveWebSocketBaseUrl();
    const sessionStr = localStorage.getItem("session");
    let token = "";
    try {
      token = sessionStr ? JSON.parse(sessionStr)?.token || "" : "";
    } catch {
      token = "";
    }
    const ws = new WebSocket(`${wsUrl}/api/meetings/${meetingId}/stream?token=${encodeURIComponent(token)}`);

    ws.onopen = () => {
      if (!isCurrentConnection()) return;
      const wasReconnect = retryCountRef.current > 0;
      retryCountRef.current = 0;
      setStatus("streaming");
      if (wasReconnect) {
        onReconnectRef.current?.();
      }
    };

    ws.onmessage = (event) => {
      if (!isCurrentConnection()) return;
      try {
        const data = JSON.parse(event.data);
        setLastEvent(data);

        if (data.type === "transcript.chunk" || data.type === "transcript_chunk") {
          const text = data.text || data.segments?.map((segment: any) => segment.text).filter(Boolean).join(" ") || "";
          const chunk = {
              id: data.id || `${data.user_id || data.userId || "unknown"}-${data.chunkIndex ?? data.chunk_index ?? Date.now()}`,
              userId: data.user_id || data.userId,
              chunkIndex: data.chunkIndex ?? data.chunk_index,
              speaker: data.speaker || data.segments?.[0]?.speaker_display_name || data.segments?.[0]?.speaker || "Speaker_01",
              text,
              segments: data.segments || [],
              timestamp: data.timestamp ? new Date(data.timestamp).getTime() : Date.now(),
              isNew: true,
            };
          const key = `${chunk.userId || chunk.speaker}:${chunk.chunkIndex ?? chunk.id}`;
          setTranscript((prev) => {
            const next = prev.filter((item) => `${item.userId || item.speaker}:${item.chunkIndex ?? item.id}` !== key);
            return [...next, chunk].sort((a, b) => a.timestamp - b.timestamp);
          });
        } else if (data.type === "status_update") {
          setStatus(data.status);
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    ws.onerror = (event) => {
      if (!isCurrentConnection()) return;
      console.error("Meeting WebSocket error", { meetingId, wsUrl, event });
    };

    ws.onclose = (event) => {
      if (!isCurrentConnection()) return;
      if (event.code !== 1000) {
        console.warn("Meeting WebSocket closed", {
          meetingId,
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          wsUrl,
        });
      }
      if (event.code === 1000) {
        setStatus((prev) => (prev === "idle" ? "idle" : "done"));
        return;
      }
      if (retryCountRef.current < MAX_RETRIES) {
        const delay = Math.min(BASE_DELAY * Math.pow(2, retryCountRef.current), MAX_DELAY);
        retryCountRef.current++;
        setStatus("connecting");
        reconnectTimerRef.current = window.setTimeout(() => connectRef.current(meetingId), delay);
      } else if (retryCountRef.current >= MAX_RETRIES) {
        setStatus("error");
      }
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const sendJson = useCallback((payload: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }, []);

  const disconnect = useCallback(() => {
    connectionSeqRef.current += 1;
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    retryCountRef.current = 0;
    meetingIdRef.current = null;
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus("idle");
  }, []);

  const onReconnect = useCallback((callback: () => void) => {
    onReconnectRef.current = callback;
  }, []);

  useEffect(() => {
    return () => {
      connectionSeqRef.current += 1;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    transcript,
    lastEvent,
    status,
    connect,
    sendJson,
    disconnect,
    isConnected: status === "streaming",
    onReconnect,
  };
}
