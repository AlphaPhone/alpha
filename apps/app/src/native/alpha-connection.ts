import type { PluginListenerHandle } from '@capacitor/core';
import type { GoogleWorkspaceBinding, GoogleWorkspaceReturnPort } from '../runtime/google-workspace-return';

/** A native HTTPS request. `retryAfter` is the Retry-After header of an error response, when present. */
export type ConnectionRequest = { requestId: string; url: string; method: string; headers: Record<string, string>; body?: string; credentialReference?: string; expiresAt?: number };
export type ConnectionResponse = { status: number; data: unknown; retryAfter?: string };
/** The Cloud delegation callback the app link delivered, until the panel clears it. */
export type DelegationCallback = { state: string; code?: string; error?: string };

/**
 * AlphaConnectionPlugin: owner HTTPS requests, renderer credential slots, external sign-in pages,
 * the Google Workspace app-link return and the Cloud delegation callback. The browser build registers
 * its own factory under the same name (runtime/native-connection.ts), so this module exports no
 * singleton.
 */
export interface AlphaConnectionPlugin {
  request(input: ConnectionRequest): Promise<ConnectionResponse>;
  cancel(input: { requestId: string }): Promise<void>;
  secureRead(input: { slot: string }): Promise<{ value: string | null }>;
  secureWrite(input: { slot: string; value: string }): Promise<void>;
  secureCompareExchange(input: { slot: string; expectedValue: string | null; value: string | null }): Promise<{ status: 'saved' | 'conflict' }>;
  secureRemove(input: { slot: string }): Promise<void>;
  openExternal(input: { url: string; requestId: string }): Promise<void>;
  readDelegationCallback(): Promise<{ callback: DelegationCallback | null }>;
  clearDelegationCallback(input: { state: string }): Promise<void>;
  /** Android only; the browser connections lack it, so callers keep the optional call. */
  prepareGoogleWorkspaceReturn?(binding: GoogleWorkspaceBinding): ReturnType<GoogleWorkspaceReturnPort['prepare']>;
  /** Android only; the browser connections lack it, so callers keep the optional call. */
  consumeGoogleWorkspaceReturn?(binding: GoogleWorkspaceBinding): ReturnType<GoogleWorkspaceReturnPort['consume']>;
  /** Android only; the browser connections lack it, so callers keep the optional call. */
  cancelGoogleWorkspaceReturn?(input: { state: string }): Promise<void>;
  addListener(event: 'cloudDelegationCallback' | 'googleWorkspaceReturn', listener: () => void): Promise<PluginListenerHandle>;
}

/** Test-mocks admission only (runtime/mock-admission.ts): fences live notification collection. */
export interface AlphaConnectionTestMethods {
  pauseNotificationCollection(): Promise<void>;
}
