import { useState, useEffect, useCallback, useRef } from "react";

interface TranscriptChunk {
  id: string;
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

export function useWebSocket(): UseWebSocketReturn {
  const [transcript, setTranscript] = useState<TranscriptChunk[]>([]);
  const [lastEvent, setLastEvent] = useState<any | null>(null);
  const [status, setStatus] = useState<UseWebSocketReturn["status"]>("idle");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const connectRef = useRef<(meetingId: string) => void>(() => {});
  const meetingIdRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);
  const onReconnectRef = useRef<(() => void) | null>(null);

  const MAX_RETRIES = 10;
  const BASE_DELAY = 1000;
  const MAX_DELAY = 15000;

  const connect = useCallback((meetingId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    meetingIdRef.current = meetingId;
    setStatus("connecting");
    setTranscript([]);

    const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    const wsUrl = baseURL.replace(/\/+$/, "").replace(/\/api$/i, "").replace(/^http/, "ws");
    const sessionStr = localStorage.getItem("session");
    let token = "";
    try {
      token = sessionStr ? JSON.parse(sessionStr)?.token || "" : "";
    } catch {
      token = "";
    }
    const ws = new WebSocket(`${wsUrl}/api/meetings/${meetingId}/stream?token=${encodeURIComponent(token)}`);

    ws.onopen = () => {
      const wasReconnect = retryCountRef.current > 0;
      retryCountRef.current = 0;
      setStatus("streaming");
      if (wasReconnect) {
        onReconnectRef.current?.();
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastEvent(data);

        if (data.type === "transcript.chunk" || data.type === "transcript_chunk") {
          const text = data.text || data.segments?.map((segment: any) => segment.text).filter(Boolean).join(" ") || "";
          setTranscript((prev) => [
            ...prev,
            {
              id: data.id || `${Date.now()}-${Math.random()}`,
              speaker: data.speaker || data.segments?.[0]?.speaker_display_name || data.segments?.[0]?.speaker || "Speaker_01",
              text,
              segments: data.segments || [],
              timestamp: data.timestamp ? new Date(data.timestamp).getTime() : Date.now(),
              isNew: true,
            },
          ]);
        } else if (data.type === "status_update") {
          setStatus(data.status);
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    ws.onerror = () => {
      setStatus("error");
    };

    ws.onclose = () => {
      setStatus((prev) => (prev === "error" ? "error" : "done"));
      if (meetingIdRef.current === meetingId && retryCountRef.current < MAX_RETRIES) {
        const delay = Math.min(BASE_DELAY * Math.pow(2, retryCountRef.current), MAX_DELAY);
        retryCountRef.current++;
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
    setTranscript([]);
  }, []);

  const onReconnect = useCallback((callback: () => void) => {
    onReconnectRef.current = callback;
  }, []);

  useEffect(() => {
    return () => {
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
