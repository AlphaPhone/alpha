import type { PluginListenerHandle } from '@capacitor/core';
import type { WorkflowNoticeRoute } from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/client-coordinator.ts';
import type { WorkflowTap } from '../runtime/workflow-device-contract';

/** One notification row: Alpha's own, or an allowed app's mirrored by the notification listener. */
export type NotificationRow = { id: string; revision: string; source: 'own' | 'external' | 'hosted'; kind?: string; appLabel: string; title: string; text: string; at: number; clearable: boolean; canOpen: boolean; redacted?: boolean };
type NotificationKey = { id: string; revision: string; source: string };
/** App-level delivery: enabled, permission, interruption filter and channels (opaque ids). */
export type NotificationDeliveryStatus = {
  appEnabled: boolean;
  permissionGranted: boolean;
  interruption: string;
  channels: { id: string; name: string; importance: number; blocked: boolean; groupBlocked: boolean }[];
  scope: string;
};
/** Cross-app notification collection, as the owner's policy and Android's grant leave it. */
export type CrossAppStatus = {
  revision: string;
  enabled: boolean;
  accessGranted: boolean;
  connected: boolean;
  paused: boolean;
  history: boolean;
  historyUnavailable: boolean;
  apps: { packageName: string; label: string; preview: boolean; available: boolean }[];
};
/** An owner policy change, guarded by the revision the owner reviewed. */
export type NotificationPolicyChange = { expectedRevision: string; enabled?: boolean; history?: boolean; apps?: { packageName: string; preview?: boolean }[] };
/** One local notification history row; it never holds message text. */
export type NotificationHistoryRow = { id: string; appLabel: string; at: number; state: string };
/** The canonical (agent) notification the owner tapped, read once by its token. */
export type CanonicalNotificationTap = { token?: string; ownerId?: string; agentId?: string; notificationId?: string; view?: string; conversationId?: string; messageId?: string };

/**
 * AlphaNotificationsPlugin (NotificationsHostPlugin under Alpha's name): delivery settings,
 * cross-app collection, the notification list, workflow notices and canonical taps. The browser host
 * registers BrowserNotifications under the same name (browser/register.ts), so this module exports
 * no singleton.
 */
export interface AlphaNotificationsPlugin {
  status(): Promise<NotificationDeliveryStatus>;
  openChannelSettings(input: { id: string }): Promise<{ status: 'opened' }>;
  crossAppStatus(): Promise<CrossAppStatus>;
  notificationApps(): Promise<{ apps: { packageName: string; label: string }[] }>;
  setNotificationPolicy(input: NotificationPolicyChange): Promise<CrossAppStatus>;
  resumeCrossApp(input: { expectedRevision: string }): Promise<CrossAppStatus>;
  openNotificationAccess(): Promise<{ status: 'opened' }>;
  notificationHistory(): Promise<{ items: NotificationHistoryRow[] }>;
  clearNotificationHistory(): Promise<void>;
  list(): Promise<{ items: NotificationRow[]; scope: string; calendarStatus?: string }>;
  open(input: NotificationKey): Promise<void>;
  dismiss(input: NotificationKey): Promise<void>;
  clear(input: { items: NotificationKey[] }): Promise<{ outcomes: { id: string; status: string }[] }>;
  postWorkflow(input: { operationId: string; bindingHash: string; title: string; body: string; route: WorkflowNoticeRoute }): Promise<{ status: string }>;
  pendingWorkflowTap(): Promise<Partial<WorkflowTap>>;
  /** `discard` returns an explicitly canceled Ask tap to its untapped state; it opens and fills nothing. */
  consumeWorkflowTap(input: { token: string; noticeRevision?: string; discard?: boolean }): Promise<void>;
  workflowPresentationCapabilities(): Promise<{ protocol?: number }>;
  canonicalPending(): Promise<CanonicalNotificationTap>;
  acknowledgeCanonical(input: { token: string }): Promise<{ ok: boolean }>;
  addListener(event: 'pendingWorkflowTap' | 'canonicalNotificationTap', listener: () => void): Promise<PluginListenerHandle>;
}

/** Methods only the browser development host (BrowserNotifications) implements. */
export interface AlphaNotificationsBrowserMethods {
  setAlertPreferences(input: { appEnabled?: boolean; channelId?: string; enabled?: boolean }): Promise<{ status: 'saved' }>;
  openAppSettings(): Promise<{ status: string }>;
  compose(): Promise<void>;
  focusSnapshot(): Promise<{ items: NotificationRow[] }>;
}
