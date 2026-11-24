import { Capacitor, type PermissionState, type PluginListenerHandle } from '@capacitor/core';
import type { NativeLiveCapturePort, NativeVoiceTimingPort } from '../../../../.eliza/client-features/packages/voice/src/native-live-voice.ts';
import type { NoteRecordingBinding, NoteRecordingStatus } from '../prototype/note-recorder';
import type { LocalTranscript } from '../runtime/local-voice';
import type { SavedNoteAudio } from './alpha-note-audio';

/** A finished push-to-talk recording. */
export type VoiceClip = { recordingId: string; durationMs: number };
/** `recordingStopped`: native ended the recording itself (limit reached or a call started). */
export type VoiceRecordingStopped = { recordingId: string; durationMs?: number; interrupted?: 'call-active' };
/** A recording to transcribe; a saved note recording may be read from an offset. */
export type SpeechRecordingInput = { recordingId: string; requestId: string; savedNoteId?: string; savedDurationMs?: number; offsetMs?: number };
/** Playback events. `atMs` is set on segment starts; `reason` and `message` on stops and failures. */
export type SpeechPlaybackEvent = { playbackId?: string; requestId?: string; atMs?: number; reason?: string; message?: string };
/** The resident reading binding the native reviewed-reading speech checks. */
export type LocalReadingBinding = { execution: 'device'; ownerId: string; sessionId: string; expiresAt: number };
type Transcript = { text: string; local: false };
type Playback = { playbackId: string };

/** Push-to-talk recording, Cloud and on-device speech, playback, the Notes recorder and permissions. */
export interface AlphaVoiceCloudMethods {
  checkPermissions(): Promise<{ microphone: PermissionState }>;
  requestPermissions(options: { permissions: ['microphone'] }): Promise<{ microphone: PermissionState }>;
  startRecording(input?: { maxDurationMs: 29000 | 59000 }): Promise<{ recordingId: string; maxDurationMs: number }>;
  stopRecording(): Promise<VoiceClip>;
  cancelRecording(): Promise<void>;
  getRecordingMetrics(input: { recordingId: string }): Promise<{ recordingId: string; peak: number; rms?: number }>;
  transcribeRecording(input: SpeechRecordingInput & { environment: string; credentialId: string }): Promise<Transcript>;
  synthesize(input: { text: string; requestId: string; environment: string; credentialId: string; replace?: boolean }): Promise<Playback>;
  transcribeOwnRecording(input: SpeechRecordingInput & { providerRevision: string }): Promise<Transcript>;
  synthesizeOwn(input: { text: string; requestId: string; providerRevision: string; replace?: boolean }): Promise<Playback>;
  /** `ready` is full speech readiness; native reports no separate `playback` today. */
  localSpeechStatus(input: { requestId: string }): Promise<{ ready: boolean; playback?: boolean; execution: string }>;
  transcribeLocalRecording(input: { recordingId: string; requestId: string }): Promise<LocalTranscript>;
  /** One window of audio the app holds: a complete mono 16 kHz PCM16 WAV of at most sixty seconds, base64. */
  transcribeLocalAudio(input: { wav: string; requestId: string }): Promise<LocalTranscript>;
  releaseLocalSpeech(): Promise<void>;
  /** With `append`, the sentence joins the playing utterance and the result may carry no new playback. */
  synthesizeLocal(input: { text: string; requestId: string; replace?: false; append?: true; voiceTurnId?: string }): Promise<{ playbackId?: string; execution?: string; appended?: boolean }>;
  /** Speaks the page text the browser review approved; the renderer sends only its one-use token. */
  synthesizeLocalBrowserReading(input: LocalReadingBinding & { readingToken: string; requestId: string }): Promise<{ playbackId: string; execution: string }>;
  warmSpeechOutput(): Promise<void>;
  /** Present on Android; absent on the browser host, so callers keep the optional call. */
  holdSpeechEngine?(): Promise<unknown>;
  /** Present on Android; absent on the browser host, so callers keep the optional call. */
  releaseSpeechEngineHold?(): Promise<unknown>;
  play(input: { playbackId: string; replace?: boolean }): Promise<void>;
  stopPlayback(input?: { requestId: string; playbackId?: string }): Promise<void>;
  cancel(input: { requestId: string }): Promise<void>;
  workflowPresentationCapabilities(): Promise<{ protocol?: number }>;
  startNoteRecording(input: NoteRecordingBinding): Promise<NoteRecordingStatus>;
  noteRecordingStatus(): Promise<NoteRecordingStatus>;
  pauseNoteRecording(input: { recordingId: string }): Promise<NoteRecordingStatus>;
  resumeNoteRecording(input: { recordingId: string }): Promise<NoteRecordingStatus>;
  stopNoteRecording(input: { recordingId: string }): Promise<NoteRecordingStatus>;
  discardNoteRecording(input: { recordingId: string }): Promise<NoteRecordingStatus>;
  setNoteSegmentText(input: { recordingId: string; segmentId: string; text: string }): Promise<void>;
  claimCanonicalNoteSave(input: { recordingId: string }): Promise<{ claimed: boolean }>;
  saveNoteRecording(input: { recordingId: string; noteId: string; transcript: string }): Promise<SavedNoteAudio>;
  addListener(event: 'recordingStopped', listener: (clip: VoiceRecordingStopped) => void): Promise<PluginListenerHandle>;
  addListener(event: 'playbackEnded' | 'playbackFailed' | 'playbackStopped' | 'playbackSegmentStarted', listener: (event: SpeechPlaybackEvent) => void): Promise<PluginListenerHandle>;
  addListener(event: 'noteRecordingChanged', listener: (status: NoteRecordingStatus) => void): Promise<PluginListenerHandle>;
}

/**
 * AlphaVoiceCloudPlugin (LocalSpeechBridgePlugin under Alpha's name). The browser host registers
 * BrowserVoice under the same name (browser/register.ts), so this module exports no singleton.
 */
export type AlphaVoiceCloudPlugin = NativeLiveCapturePort & NativeVoiceTimingPort & AlphaVoiceCloudMethods;

/** Development Cloud voice routes only the browser development host (BrowserVoice) implements. */
export interface AlphaVoiceCloudBrowserMethods {
  transcribeDevelopmentCloudRecording(input: SpeechRecordingInput & { route?: 'cloud' | 'direct' }): Promise<Transcript>;
  synthesizeDevelopmentCloud(input: { text: string; requestId: string; replace?: boolean; route?: 'cloud' | 'direct' }): Promise<Playback>;
}

/** The native speech bridge is present (Android). */
export const voiceCloudAvailable = (): boolean => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('AlphaVoiceCloud');
