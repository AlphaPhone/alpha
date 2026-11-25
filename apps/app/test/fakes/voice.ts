// spec/app/voice/index.md, "Story: Hold a spoken conversation"; spec/app/voice/index.md, "The speech pipeline warms on startup, foreground return and account readiness without opening the microphone"
import type { ElizaSignInPlugin, CloudStreamEvent, ElizaCloudSpeechPlugin } from "@elizaos/os-bridges";
import { type Faked, plugin, rejection } from "./phone.ts";

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
  nativeTransport: boolean;
  transcriptionFailures: number;
  voicemailTranscription: ((id: string, requestId: string) => Promise<string>) | undefined;
  readonly canceledVoicemailTranscriptions: string[];
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
  readonly cloudStarts: { readonly environment: string; readonly credentialId: string }[];
  readonly relayWarmups: string[];
  relayWarmupHangs: boolean;
  onDevice: boolean;
  credentialId: string;
  streamTiming: unknown;
  stopCloudSpeechCalls: number;
  hushCalls: number;
  readonly spoken: SpokenSentence[];
  activeMicSession: string | undefined;
  emitLocal?: (event: string, data: unknown) => void;
  emitCloud?: (event: CloudStreamEvent) => void;
  /** The phone's sign-in settling on the account whose key is `credentialId` now, as `ElizaSignInPlugin.java` tells it. */
  signedInHere?: () => void;
}

export function voiceScene(): VoiceScene {
  return {
    permission: "granted",
    grantOnRequest: true,
    localReady: true,
    liveCaptureAvailable: true,
    nativeTransport: true,
    transcriptionFailures: 0,
    voicemailTranscription: undefined,
    canceledVoicemailTranscriptions: [],
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
    cloudStarts: [],
    relayWarmups: [],
    relayWarmupHangs: false,
    onDevice: true,
    credentialId: "cred-1",
    streamTiming: { format: "alpha-cloud-stream-timing-v1", records: [] },
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
    let activeRecording: string | undefined;
    let finishedRecording: string | undefined;
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
        return { available: voice.liveCaptureAvailable, nativeTransport: voice.nativeTransport };
      },
      startLiveCapture: ({ captureId, nativeAsr }: { captureId: string; nativeAsr: boolean }) => {
        voice.startLiveCaptureCalls += 1;
        voice.activeMicSession = captureId;
        return Promise.resolve({ captureId, nativeAsr, echoCancelled: true });
      },
      stopLiveCapture: ({ captureId }: { captureId: string }) => {
        voice.stopLiveCaptureCalls += 1;
        if (voice.activeMicSession === captureId) voice.activeMicSession = undefined;
        return Promise.resolve({ captureId, serverClosed: true });
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
      cancel: () => Promise.resolve({}),
      startRecording: () => {
        activeRecording = `rec-${++recordingSeq}`;
        finishedRecording = undefined;
        return Promise.resolve({ recordingId: activeRecording });
      },
      stopRecording: () => {
        if (activeRecording === undefined) return Promise.reject(new Error("No recording is active"));
        finishedRecording = activeRecording;
        activeRecording = undefined;
        return Promise.resolve({ recordingId: finishedRecording });
      },
      cancelRecording: () => {
        activeRecording = undefined;
        finishedRecording = undefined;
        return Promise.resolve({});
      },
      transcribeLocalRecording: ({ recordingId }: { recordingId: string }) => {
        if (finishedRecording !== recordingId) return Promise.reject(new Error("Recording unavailable"));
        if (voice.transcriptionFailures > 0) {
          voice.transcriptionFailures -= 1;
          return Promise.reject(new Error("Recognition failed"));
        }
        return Promise.resolve({ text: "Dictated note" });
      },
      transcribeVoicemail: async ({ id, requestId }: { id: string; requestId: string }) => {
        if (!voice.voicemailTranscription) throw rejection("Voicemail recognizer unavailable", "unavailable");
        return { text: await voice.voicemailTranscription(id, requestId) };
      },
      cancelVoicemailTranscription: ({ requestId }: { requestId: string }) => {
        voice.canceledVoicemailTranscriptions.push(requestId);
        return Promise.resolve({});
      },
    };
  };
}

/** What `SpeechStreamBridgePlugin.java` answers beyond eliza's TypeScript definition: the relay's warm-up and its timing records. */
type RelayExtras = {
  prewarmCloudSpeech(input: { environment: string }): Promise<unknown>;
  cloudStreamTiming(input: Record<string, never>): Promise<unknown>;
};

export function elizaCloudSpeech(voice: VoiceScene): Faked {
  return plugin<ElizaCloudSpeechPlugin & RelayExtras, { cloudSpeechEvent: CloudStreamEvent }>((emit) => {
    voice.emitCloud = (event) => emit("cloudSpeechEvent", event);
    return {
      prewarmCloudSpeech: ({ environment }) => {
        voice.relayWarmups.push(environment);
        return voice.relayWarmupHangs ? new Promise<never>(() => undefined) : Promise.resolve();
      },
      cloudStreamTiming: () => Promise.resolve(voice.streamTiming),
      startCloudSpeech: ({ sessionId, environment, credentialId }) => {
        voice.cloudStarts.push({ environment, credentialId });
        if (credentialId !== voice.credentialId) return Promise.reject(rejection("Voice is already active or unavailable"));
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

/** `ElizaSignInPlugin.java`'s `status`, the registered cloud's readiness and the account its key belongs to, and its `signInSettled` receipt, as the wire carries it. */
export function elizaSignIn(voice: VoiceScene, signedIn: () => boolean): Faked {
  return plugin<Pick<ElizaSignInPlugin, "status">, { signInSettled: unknown }>((emit) => {
    voice.signedInHere = () => emit("signInSettled", { request: 1, attempt: 1, verdict: "signed-in-as", credentialId: voice.credentialId, google: "not-requested" });
    return {
      status: ({ environment }) => Promise.resolve({
        environment, methodsKnown: true, email: true, sms: false, google: false, googleMode: "browser",
        account: signedIn()
          ? { signedIn: true, userId: "user-1", organizationId: "org-1", credentialId: voice.credentialId, keyExpiresAt: 4_102_444_800_000 }
          : { signedIn: false },
      }),
    };
  });
}
