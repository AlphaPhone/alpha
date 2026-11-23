import type { PluginListenerHandle } from '@capacitor/core';
import { registerPlugin } from '../platform-plugins';
import type { LocalProviderKey, LocalProviderMode } from '../runtime/local-agent';

/** A request to the resident agent over its IPC socket. `cancelId` withdraws one not yet dispatched. */
export interface NativeRequestPort {
  request(input: Record<string, unknown>): Promise<{ status: number; body?: string }>;
  cancelRequest(input: { cancelId: string }): Promise<unknown>;
}
/** A streamed chat turn. Envelopes are untrusted until local-agent-native-stream parses them. */
export interface NativeStreamPort {
  requestStream(input: Record<string, unknown>): Promise<{ streamId: string }>;
  cancelStream(input: { streamId: string }): Promise<unknown>;
  addListener(event: 'alphaAgentStream', listener: (envelope: unknown) => void): Promise<PluginListenerHandle>;
}
/** Live, voice-only agent events. No replay, persistence or automatic resubscription. */
export interface NativeVoiceEventPort {
  subscribeVoiceEvents(input: { subscriptionId: string; ownerId: string }): Promise<{ subscriptionId: string }>;
  unsubscribeVoiceEvents(input: { subscriptionId: string }): Promise<unknown>;
  addListener(event: 'alphaVoiceEvent', listener: (envelope: unknown) => void): Promise<PluginListenerHandle>;
}
/** Typed, live-only renderer view events over the resident IPC feed. */
export interface NativeViewEventPort {
  subscribeViewEvents(input: { subscriptionId: string; ownerId: string; clientId: string }): Promise<{ subscriptionId: string }>;
  unsubscribeViewEvents(input: { subscriptionId: string }): Promise<unknown>;
  addListener(event: 'alphaViewEvent', listener: (frame: unknown) => void): Promise<PluginListenerHandle>;
}
/** The packaged resident agent's lifecycle, recovery review and model-provider settings. Results
 * other than `getStatus` are untrusted until the local-agent parsers read them. */
export interface AgentLifecyclePort {
  start(input?: { requestId: string }): Promise<unknown>;
  cancelStart(input: { requestId: string }): Promise<unknown>;
  stop(): Promise<unknown>;
  getStatus(): Promise<{ packaged?: boolean; state?: string; reason?: string; serviceActive?: boolean; socketListening?: boolean }>;
  reviewRecovery(): Promise<unknown>;
  archiveRecovery(input: { reviewToken: string }): Promise<unknown>;
  prepareProviderConfiguration(): Promise<{ requestId: string }>;
  configureProvider(input: { apiKey: string; model: string; cartesiaKey?: string; requestId: string }): Promise<unknown>;
  cancelProviderConfiguration(input: { requestId: string }): Promise<void>;
  providerStatus(): Promise<Record<string, unknown>>;
  selectProvider(input: { mode: LocalProviderMode; expectedRevision: string; requestId: string }): Promise<unknown>;
  editProviderKeys(input: { textKey?: string; voiceKey?: string; expectedRevision: string; requestId: string }): Promise<unknown>;
  removeProviderKey(input: { key: LocalProviderKey; expectedRevision: string; requestId: string }): Promise<unknown>;
  revealProviderKey(input: { key: LocalProviderKey; expectedRevision: string; requestId: string }): Promise<unknown>;
  clearProvider(input?: { onlyIfPresent?: true; requestId?: string }): Promise<{ configured?: unknown }>;
  clearProviderIfCurrent(input: { bindingGuard: string }): Promise<{ outcome?: unknown }>;
  /** Read-only native query; see residentAttachable. */
  residentAttachment(input: { credentialId?: string }): Promise<{ attachable?: unknown; reason?: unknown; bindingGuard?: unknown }>;
  configureCloudProvider(input: { credentialId: string; model: string }): Promise<unknown>;
  /** Owner switches enforced by the native Google host before agent writes. */
  setGoogleAgentAccess(input: { gmailChanges: boolean; calendarEdits: boolean }): Promise<void>;
}

/** AlphaLocalAgentPlugin: the packaged resident agent behind Alpha's `Agent` plugin name. */
export type AgentPlugin = AgentLifecyclePort & NativeRequestPort & NativeStreamPort & NativeVoiceEventPort & NativeViewEventPort;
export const agent = registerPlugin<AgentPlugin>('Agent');
