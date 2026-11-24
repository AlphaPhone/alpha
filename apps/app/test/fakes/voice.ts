// spec/app/voice/index.md, "Story: Hold a spoken conversation"; spec/app/voice/index.md, "The speech pipeline warms on startup, foreground return and account readiness without opening the microphone"
import type { CloudStreamEvent, ElizaCloudSpeechPlugin } from "@elizaos/os/bridges/definitions/voice";
import { type Faked, plugin } from "./phone.ts";

export interface SpokenSentence {
  readonly text: string;
  readonly append: boolean;
  readonly replace: boolean;
  readonly channel: "local" | "cloud";
}

export interface VoiceScene {
  permission: "granted" | "denied" | "prompt";
  grantOnRequest: boolean;
  localReady: boolean;
  liveCaptureAvailable: boolean;
  probeGate: (() => Promise<void>) | undefined;
  warmSpeechOutputCalls: number;
  localSpeechStatusCalls: number;
  liveCaptureStatusCalls: number;
  cloudWarmCalls: number;
  holdEngineCalls: number;
  releaseEngineHoldCalls: number;
  engineHeld: boolean;
  startLiveCaptureCalls: number;
  stopLiveCaptureCalls: number;
  startCloudSpeechCalls: number;
  stopCloudSpeechCalls: number;
  hushCalls: number;
  readonly spoken: SpokenSentence[];
  activeMicSession: string | undefined;
  emitLocal?: (event: string, data: unknown) => void;
  emitCloud?: (event: CloudStreamEvent) => void;
}

export function voiceScene(): VoiceScene {
  return {
    permission: "granted",
    grantOnRequest: true,
    localReady: true,
    liveCaptureAvailable: true,
    probeGate: undefined,
    warmSpeechOutputCalls: 0,
    localSpeechStatusCalls: 0,
    liveCaptureStatusCalls: 0,
    cloudWarmCalls: 0,
    holdEngineCalls: 0,
    releaseEngineHoldCalls: 0,
    engineHeld: false,
    startLiveCaptureCalls: 0,
    stopLiveCaptureCalls: 0,
    startCloudSpeechCalls: 0,
    stopCloudSpeechCalls: 0,
    hushCalls: 0,
    spoken: [],
    activeMicSession: undefined,
  };
}

export function alphaVoiceCloud(voice: VoiceScene): Faked {
  return (emit) => {
    voice.emitLocal = emit;
    let playbackSeq = 0;
    let recordingSeq = 0;
    return {
      checkPermissions: () => Promise.resolve({ microphone: voice.permission }),
      requestPermissions: () => {
        voice.permission = voice.grantOnRequest ? "granted" : "denied";
        return Promise.resolve({ microphone: voice.permission });
      },
      warmSpeechOutput: () => {
        voice.warmSpeechOutputCalls += 1;
        return Promise.resolve({ warmed: true });
      },
      localSpeechStatus: async () => {
        voice.localSpeechStatusCalls += 1;
        if (voice.probeGate !== undefined) await voice.probeGate();
        return { ready: voice.localReady, ttsReady: voice.localReady };
      },
      holdSpeechEngine: () => {
        voice.holdEngineCalls += 1;
        voice.engineHeld = true;
        return Promise.resolve({ held: true });
      },
      releaseSpeechEngineHold: () => {
        voice.releaseEngineHoldCalls += 1;
        voice.engineHeld = false;
        return Promise.resolve({});
      },
      liveCaptureStatus: async () => {
        voice.liveCaptureStatusCalls += 1;
        if (voice.probeGate !== undefined) await voice.probeGate();
        return { available: voice.liveCaptureAvailable };
      },
      startLiveCapture: ({ sessionId }: { sessionId: string }) => {
        voice.startLiveCaptureCalls += 1;
        voice.activeMicSession = sessionId;
        return Promise.resolve({ started: true, echoCancelled: true });
      },
      stopLiveCapture: ({ sessionId }: { sessionId: string }) => {
        voice.stopLiveCaptureCalls += 1;
        if (voice.activeMicSession === sessionId) voice.activeMicSession = undefined;
        return Promise.resolve({});
      },
      synthesizeLocal: ({ text, append, replace }: { requestId: string; text: string; append?: boolean; replace?: boolean }) => {
        voice.spoken.push({ text, append: append === true, replace: replace !== false, channel: "local" });
        const playbackId = `pb-${++playbackSeq}`;
        return Promise.resolve({ playbackId });
      },
      play: ({ playbackId }: { playbackId: string }) => {
        emit("playbackEnded", { playbackId });
        return Promise.resolve({});
      },
      stopPlayback: () => {
        voice.hushCalls += 1;
        return Promise.resolve({});
      },
      startRecording: () => Promise.resolve({ recordingId: `rec-${++recordingSeq}` }),
      stopRecording: ({ recordingId }: { recordingId: string }) => Promise.resolve({ recordingId }),
      cancelRecording: () => Promise.resolve({}),
      transcribeLocalRecording: () => Promise.resolve({ text: "Dictated note" }),
    };
  };
}

export function elizaCloudSpeech(voice: VoiceScene): Faked {
  return plugin<ElizaCloudSpeechPlugin, { cloudSpeechEvent: CloudStreamEvent }>((emit) => {
    voice.emitCloud = (event) => emit("cloudSpeechEvent", event);
    return {
      startCloudSpeech: ({ sessionId }) => {
        voice.startCloudSpeechCalls += 1;
        voice.activeMicSession = sessionId;
        return Promise.resolve({ sessionId, sampleRate: 16000, echoCancelled: true });
      },
      stopCloudSpeech: ({ sessionId }) => {
        voice.stopCloudSpeechCalls += 1;
        if (voice.activeMicSession === sessionId) voice.activeMicSession = undefined;
        return Promise.resolve({});
      },
      setCloudSpeechOutputMuted: () => Promise.resolve({}),
      setCloudSpeechMuted: () => Promise.resolve({}),
      speakCloudSpeech: ({ sessionId, utteranceId, text }) => {
        voice.spoken.push({ text, append: false, replace: false, channel: "cloud" });
        void Promise.resolve().then(() => {
          emit("cloudSpeechEvent", { sessionId, type: "audio-start", utteranceId });
          emit("cloudSpeechEvent", { sessionId, type: "audio-end", utteranceId });
        });
        return Promise.resolve({});
      },
      cancelCloudSpeech: ({ sessionId, utteranceId }) => {
        voice.hushCalls += 1;
        emit("cloudSpeechEvent", { sessionId, type: "audio-end", utteranceId, interrupted: "cancelled" });
        return Promise.resolve({});
      },
    };
  });
}
