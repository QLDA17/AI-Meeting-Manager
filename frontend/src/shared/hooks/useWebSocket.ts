import { useState, useEffect, useCallback, useRef } from "react";

interface TranscriptChunk {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
  isNew?: boolean;
}

interface UseWebSocketReturn {
  transcript: TranscriptChunk[];
  status: "idle" | "connecting" | "streaming" | "done" | "error";
  connect: (meetingId: string) => void;
  disconnect: () => void;
  isConnected: boolean;
}

export function useWebSocket(): UseWebSocketReturn {
  const [transcript, setTranscript] = useState<TranscriptChunk[]>([]);
  const [status, setStatus] = useState<UseWebSocketReturn["status"]>("idle");
  const wsRef = useRef<WebSocket | null>(null);
  const meetingIdRef = useRef<string | null>(null);

  const connect = useCallback((meetingId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    meetingIdRef.current = meetingId;
    setStatus("connecting");
    setTranscript([]);

    const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
    const wsUrl = baseURL.replace(/^http/, "ws");
    const ws = new WebSocket(`${wsUrl}/api/meetings/${meetingId}/stream`);

    ws.onopen = () => {
      setStatus("streaming");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "transcript_chunk") {
          setTranscript((prev) => [
            ...prev,
            {
              id: data.id || `${Date.now()}-${Math.random()}`,
              speaker: data.speaker || "Unknown",
              text: data.text,
              timestamp: data.timestamp || Date.now(),
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
    };

    wsRef.current = ws;
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus("idle");
    setTranscript([]);
  }, []);

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    transcript,
    status,
    connect,
    disconnect,
    isConnected: status === "streaming",
  };
}
