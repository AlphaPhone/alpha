import type { PluginListenerHandle } from '@capacitor/core';
import type { WorkflowNoticeRoute } from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/client-coordinator.ts';
import type { SourceRenewalTap } from '../runtime/source-renewal-question';

/** The finished hosted run a result notice opens. */
export type HostedResultRoute = { scope: string; origin: string; ownerId: string; agentId: string; runId: string; workflowId: string; workflowVersionId: string };
/** One pending phone-step approval notice. */
export type ApprovalNotice = { id: string; bindingHash: string; expiresAt: number; route: WorkflowNoticeRoute };

/**
 * AlphaHostedResultsPlugin: hosted result notices, the background inbox, native digest sources with
 * their renewal reminders, and workflow approval notices. The browser host registers
 * browserHostedResults under the same name (browser/register-hosted-results.ts), so this module
 * exports no singleton.
 */
export interface AlphaHostedResultsPlugin {
  publishResult(route: HostedResultRoute): Promise<{ phase: string }>;
  pendingResult(): Promise<Partial<HostedResultRoute> & { token?: string; retained?: boolean; question?: boolean }>;
  consumeResult(input: { token: string }): Promise<void>;
  /** Present on Android; the browser host lacks it, so callers keep the optional call. */
  releaseResultQuestion?(input: { token: string }): Promise<void>;
  /** Android: these runs were shown in the app, so their notices are withdrawn. A captured tap stays pending. */
  withdrawResult?(input: { scope: string; runIds: string[] }): Promise<{ withdrawn: number }>;
  /** Android: the scope whose results panel is on screen, or null. A result for it posts silently. */
  setResultsShowing?(input: { scope: string | null }): Promise<void>;
  status(): Promise<{ enabled: boolean; backgroundEnabled?: boolean; backgroundStatus?: string; lastSuccess?: number }>;
  enable(): Promise<{ enabled: boolean }>;
  setBackgroundPolling(input: { enabled: boolean }): Promise<{ enabled: boolean; backgroundEnabled?: boolean }>;
  beginBackground(input: { attemptId: string }): Promise<void>;
  cancelBackground(input: { attemptId: string }): Promise<void>;
  configureBackground(input: Record<string, unknown>): Promise<{ generation: string; scope: string }>;
  disableBackground(input?: { sessionId: string }): Promise<void>;
  syncInbox(input: { sessionId: string }): Promise<{ entries: unknown[] }>;
  inboxHistory(input: { sessionId: string }): Promise<{ entries: unknown[] }>;
  nativeSourceIdentity(input: { sessionId: string }): Promise<Record<string, unknown>>;
  nativeSourceConsent(input: Record<string, unknown>): Promise<Record<string, unknown>>;
  scheduleSourceRenewal(input: { selection: SourceRenewalTap['selection']; expiresAt: number }): Promise<void>;
  clearSourceRenewal(input: { selection: SourceRenewalTap['selection'] }): Promise<void>;
  pendingSourceRenewal(): Promise<Partial<SourceRenewalTap>>;
  settleSourceRenewal(input: { token: string; discard: boolean }): Promise<void>;
  postWorkflowApprovalNotice(input: ApprovalNotice): Promise<{ status: string }>;
  resumeWorkflowApprovalNotice(input: ApprovalNotice): Promise<{ status: string }>;
  withdrawWorkflowApprovalNotice(input: { id: string }): Promise<void>;
  withdrawOtherOwnerApprovalNotices(input: { owner: { origin: string; ownerId: string; agentId: string } | null }): Promise<{ withdrawn: number; suspended?: ApprovalNotice[] }>;
  addListener(event: 'pendingResult' | 'renewSource', listener: () => void): Promise<PluginListenerHandle>;
}
