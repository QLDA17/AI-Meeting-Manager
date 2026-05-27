export type SttProvider = "deepgram" | "viwhisper";
export type TranscriptionMode = "realtime" | "deferred";

interface ProviderInfo {
  label: string;
  description: string;
  modes: TranscriptionMode[];
  diarization: boolean;
  streaming: boolean;
  capabilities: {
    realtime: boolean;
    deferred: boolean;
  };
}

interface ModeInfo {
  label: string;
  description: string;
}

export const STT_PROVIDERS: Record<SttProvider, ProviderInfo> = {
  deepgram: {
    label: "Deepgram",
    description: "Nova-3 — nhanh, hỗ trợ realtime",
    modes: ["realtime", "deferred"],
    diarization: true,
    streaming: true,
    capabilities: { realtime: true, deferred: true },
  },
  viwhisper: {
    label: "ViWhisper",
    description: "Mô hình tiếng Việt — chính xác cao",
    modes: ["deferred"],
    diarization: false,
    streaming: false,
    capabilities: { realtime: false, deferred: true },
  },
};

export const STT_CAPABILITIES = Object.fromEntries(
  Object.entries(STT_PROVIDERS).map(([provider, info]) => [provider, info.capabilities]),
) as Record<SttProvider, { realtime: boolean; deferred: boolean }>;

export const normalizeSttProvider = (provider?: string): SttProvider =>
  provider === "viwhisper" ? "viwhisper" : "deepgram";

export const normalizeTranscriptionMode = (provider?: string, mode?: string): TranscriptionMode => {
  const normalizedProvider = normalizeSttProvider(provider);
  const requestedMode = mode === "deferred" ? "deferred" : "realtime";
  if (!STT_CAPABILITIES[normalizedProvider][requestedMode]) {
    return "deferred";
  }
  return requestedMode;
};

export const TRANSCRIPTION_MODES: Record<TranscriptionMode, ModeInfo> = {
  realtime: {
    label: "Phiên âm trực tiếp",
    description: "Hiển thị transcript trong khi họp",
  },
  deferred: {
    label: "Phiên âm sau họp",
    description: "Xử lý transcript sau khi kết thúc",
  },
};

export const PROVIDER_LIST = Object.entries(STT_PROVIDERS).map(([id, info]) => ({
  id: id as SttProvider,
  ...info,
}));
