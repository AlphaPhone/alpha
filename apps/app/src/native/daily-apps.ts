import type { PermissionState, PluginListenerHandle } from '@capacitor/core';
import type { ReminderCreateOperation, ReminderCreateResult } from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/reminder-create-contract.ts';
import type { ReminderOperation, ReminderTarget, ReminderResult } from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/reminder-contract.ts';
import type { Action, ClockRequest, ClockResult, NativeResult, Reminder } from '../daily';

/** What this build's DailyApps supports; the version fields are absent on older builds. */
export type DailySurfaceInfo = { assistant: boolean; reminderCreationVersion?: 1; reminderTapVersion?: 1; reminderTimingVersion?: 2; clockRepeatDaysVersion?: number; bottomInset?: number; topInset?: number };
type ReminderAgentOperation = { operationId: string; bindingHash: string; operation: ReminderOperation | ReminderCreateOperation };
type ReminderAgentReply = { status: string; result?: ReminderResult | ReminderCreateResult; message?: string };

/**
 * DailyAppsPlugin (the shared ReminderPlugin under Alpha's name): app handoffs, selected documents,
 * reminders and to-dos, the Clock handoff and the assistant surface. The browser host registers
 * BrowserDaily under the same name (browser/register.ts) and daily.ts owns the one registration,
 * so this module exports no singleton.
 */
export interface DailyAppsPlugin {
  checkPermissions(): Promise<{ notifications: PermissionState; camera: PermissionState }>;
  requestPermissions(options: { permissions: ['notifications'] | ['camera'] }): Promise<{ notifications: PermissionState; camera: PermissionState }>;
  surfaceInfo(): Promise<DailySurfaceInfo>;
  closeAssistant(): Promise<{ closed: boolean }>;
  capabilities(): Promise<{ platform: string; actions: { action: Action; available: boolean; mode: string }[] }>;
  perform(options: { action: Action; query?: string; title?: string; body?: string; url?: string; startTime?: number; endTime?: number; mime?: string[]; initialLocation?: 'downloads' }): Promise<NativeResult>;
  clockHandoff(options: ClockRequest): Promise<ClockResult>;
  restoreSelected(): Promise<NativeResult>;
  describeSelected(options: { selectionId: string }): Promise<NativeResult>;
  renameSelected(options: { selectionId: string; name: string }): Promise<NativeResult>;
  pdfSelected(options: { selectionId: string; page: number }): Promise<{ status: string; message?: string; page?: number; pageCount?: number; imageUri?: string; text?: string }>;
  readSelected(options: { selectionId: string }): Promise<{ status: string; text?: string; mimeType?: string; bytes?: number; message?: string }>;
  openSelected(options: { selectionId: string }): Promise<{ status: string; message?: string }>;
  shareSelected(options: { selectionId: string }): Promise<{ status: string; message?: string }>;
  forgetSelected(options: { selectionId: string }): Promise<void>;
  scheduleReminder(options: { id: string; title: string; body?: string; at: number; recurrence?: Reminder['recurrence']; dueAt?: number; alertMinutes?: number | null }): Promise<{ status: 'pending' | 'scheduled' | 'permission-denied' | 'past' | 'failed'; id: string; mode: 'inexact' | 'none'; message?: string }>;
  listReminders(): Promise<{ reminders: Reminder[]; notificationsEnabled: boolean }>;
  selectedReminder(options: { id: string }): Promise<ReminderTarget>;
  operateReminder(options: ReminderAgentOperation): Promise<ReminderAgentReply>;
  reminderOperationReceipt(options: ReminderAgentOperation): Promise<ReminderAgentReply>;
  reminderDecision(options: { id: string; occurrenceId: string; action: 'done' | 'snooze' }): Promise<{ status: string; message?: string }>;
  saveTodo(options: { id: string; title: string; body?: string }): Promise<{ status: string; id: string; message?: string }>;
  todoDecision(options: { target: NonNullable<Reminder['target']>; action: 'done' | 'reopen' | 'cancel' }): Promise<{ status: string; id: string }>;
  pendingReminderTap(): Promise<{ token?: string; target?: ReminderTarget; retained?: boolean; question?: boolean }>;
  consumeReminderTap(options: { token: string }): Promise<void>;
  releaseReminderQuestion(options: { token: string }): Promise<void>;
  dismissReminderTap(options: { token: string }): Promise<void>;
  addListener(event: 'pendingReminderTap' | 'appResumed', listener: () => void): Promise<PluginListenerHandle>;
  addListener(event: 'assistantInvoked', listener: (result: { source: 'android-assist'; surface: 'assistant' }) => void): Promise<PluginListenerHandle>;
  addListener(event: 'restoredResult', listener: (result: NativeResult) => void): Promise<PluginListenerHandle>;
  addListener(event: 'reminderOpened', listener: (result: { id: string; occurrenceId?: string }) => void): Promise<PluginListenerHandle>;
}
