import { registerPlugin } from '../platform-plugins';
import { voiceCloudAvailable as available } from '../native/alpha-voice-cloud.ts';
import { connectionController } from './connection-ui';
import { createNativeLiveVoice, type NativeLiveCapturePort, type NativeResidentBinding } from '../../../../.eliza/client-features/packages/voice/src/native-live-voice.ts';
import type { LiveVoiceLatency } from './live-voice';

/**
 * Binds the shared native live transport (`@elizaos/voice/native-live`) to the AlphaVoiceCloud
 * bridge and the current resident session; the shared transport owns capture, fences and routes.
 */
const plugin = registerPlugin<NativeLiveCapturePort>('AlphaVoiceCloud');
const LIVE_STATUS_CACHE_TTL_MS = 10_000;
type LiveStatusResult = Awaited<ReturnType<NativeLiveCapturePort['liveCaptureStatus']>>;
let cachedLiveStatus: { at: number; value: LiveStatusResult } | undefined;
let inflightLiveStatus: Promise<LiveStatusResult> | undefined;
let cachedAgentLiveStatus: { sessionId: string; at: number; value: unknown } | undefined;
let inflightAgentLiveStatus: { sessionId: string; promise: Promise<unknown> } | undefined;

export function invalidateNativeLiveVoiceCache(): void {
  cachedLiveStatus = undefined;
  cachedAgentLiveStatus = undefined;
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { invalidateNativeLiveVoiceCache(); });
}
let lastCachedSessionId = connectionController.getSnapshot().session?.sessionId;
connectionController.subscribe(() => {
  const snapshot = connectionController.getSnapshot();
  const sessionId = snapshot.session?.sessionId;
  if (sessionId !== lastCachedSessionId || snapshot.open) {
    lastCachedSessionId = sessionId;
    invalidateNativeLiveVoiceCache();
  }
});

/** Cached bridge wrapper so startup prewarm, voice.ready(), and voice.open() avoid redundant native status probes. */
const cachedPort: NativeLiveCapturePort = {
  ...plugin,
  async liveCaptureStatus() {
    if (cachedLiveStatus && Date.now() - cachedLiveStatus.at < LIVE_STATUS_CACHE_TTL_MS) {
      return cachedLiveStatus.value;
    }
    if (inflightLiveStatus) return inflightLiveStatus;
    const pending = plugin.liveCaptureStatus().then(value => {
      const permission = (value as { permission?: unknown } | undefined)?.permission;
      if (value?.available === true && permission !== false) {
        cachedLiveStatus = { at: Date.now(), value };
      } else {
        cachedLiveStatus = undefined;
      }
      return value;
    }).finally(() => {
      if (inflightLiveStatus === pending) inflightLiveStatus = undefined;
    });
    inflightLiveStatus = pending;
    return pending;
  },
  startLiveCapture(input) {
    return plugin.startLiveCapture(input).catch(error => {
      cachedLiveStatus = undefined;
      throw error;
    });
  },
  stopLiveCapture(input) {
    return plugin.stopLiveCapture(input).catch(error => {
      cachedLiveStatus = undefined;
      throw error;
    });
  },
  addListener: plugin.addListener.bind(plugin),
};

/** The resident session's live route, with its owner only while both name the same session. */
function resident(): NativeResidentBinding | null {
  const live = connectionController.getResidentLiveVoice();
  if (!live) return null;
  const owner = connectionController.getResidentReadingBinding();
  const cachedRequest: typeof live.request = (path, body, signal) => {
    if (path === '/api/asr/local-inference/live/status' && body === undefined) {
      if (cachedAgentLiveStatus && cachedAgentLiveStatus.sessionId === live.sessionId && Date.now() - cachedAgentLiveStatus.at < LIVE_STATUS_CACHE_TTL_MS) {
        return Promise.resolve(cachedAgentLiveStatus.value);
      }
      if (inflightAgentLiveStatus?.sessionId === live.sessionId) {
        return inflightAgentLiveStatus.promise;
      }
      const pending = live.request(path, body, signal).then(value => {
        if ((value as { ready?: unknown; streaming?: unknown } | null)?.ready === true) {
          cachedAgentLiveStatus = { sessionId: live.sessionId, at: Date.now(), value };
        }
        return value;
      }).finally(() => {
        if (inflightAgentLiveStatus?.promise === pending) inflightAgentLiveStatus = undefined;
      });
      inflightAgentLiveStatus = { sessionId: live.sessionId, promise: pending };
      return pending;
    }
    return live.request(path, body, signal).catch(error => {
      if (String(path).startsWith('/api/asr/local-inference/live')) cachedAgentLiveStatus = undefined;
      throw error;
    });
  };
  return { ...live, request: cachedRequest, ...(owner && owner.sessionId === live.sessionId ? { ownerId: owner.ownerId } : {}) };
}
const voice = createNativeLiveVoice({ port: cachedPort, available, resident });

/** Advisory background warm-up for native live capture and resident streaming ASR status. */
export async function warmNativeLiveVoice(signal: AbortSignal = AbortSignal.timeout(5000)): Promise<boolean> {
  try {
    return await voice.ready(signal);
  } catch {
    return false;
  }
}

/** The live route is usable: the native capture with VAD is present and the agent reports a streaming loader. */
export function nativeLiveVoiceReady(signal: AbortSignal): Promise<boolean> { return voice.ready(signal); }
/** Opens one native capture and its agent live session. */
export const openNativeLiveStream = voice.open;
/** The voice assistant's listen port over the native capture (echo-cancelled; shared `liveAssistantListener`). */
export function nativeAssistantListener(options: { roomId?: string; onInterim?: (text: string) => void; onLatency?: (latency: LiveVoiceLatency) => void; endHangoverMs?: number } = {}) {
  return voice.assistantListener(options);
}
/**
 * Transcribe (dictation) over the native live capture, the shared `createLiveDictation`: Stop
 * finalizes exactly the audio up to Stop and the text only ever becomes an editable draft.
 */
export function createNativeLiveDictation(options: { roomId?: string; onInterim?: (text: string) => void; onLatency?: (latency: LiveVoiceLatency) => void; maxDurationMs?: number } = {}) {
  return voice.dictation(options);
}
export type NativeLiveDictation = ReturnType<typeof createNativeLiveDictation>;
