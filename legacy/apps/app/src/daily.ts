import type {ReminderTarget} from '../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/reminder-contract.ts';
import { registerPlugin } from './platform-plugins';
import type { DailyAppsPlugin } from './native/daily-apps';
import type { ClockDay } from './runtime/clock-contract';
export type Action =
  | "camera"
  | "photos"
  | "files"
  | "maps"
  | "calendar"
  | "calendar-create"
  | "email"
  | "inbox"
  | "browser"
  | "notifications"
  | "settings"
  | "reminder"
  | "voice"
  | "autofill"
  | "phone"
  | "messages"
  | "contacts";
export type Reminder = {
  target?: ReminderTarget;
  id: string;
  title: string;
  body: string;
  at: number;
  status: "pending" | "scheduled" | "posted" | "completed" | "cancelled" | "permission-denied" | "scheduling-failed";
  mode: "inexact" | "none";
  createdAt: number;
  occurrenceId?: string;
  dueAt?: number;
  alertMinutes?: number|null;
  snoozedAt?: number;
  recurrence?: {rule: "daily"|"weekdays"|"weekly";zone:string;date:string;time:string;leadMinutes:number};
  history?: {occurrenceId:string;dueAt:number;completedAt:number;skippedDates:number}[];
  postedAt?: number;
  cancelledAt?: number;
  completedAt?: number;
};
export type NativeResult = {
  status: "opened" | "selected" | "renamed-reselect" | "cancelled" | "unavailable" | "failed";
  action: Action;
  message?: string;
  selectionId?: string;
  uri?: string;
  name?: string;
  mimeType?: string;
  /** Bytes and last change (ms) when the provider reports them; a file opened from the Files
   * listing falls back to the size the listing showed. The size is a hint only, since readers
   * recheck the bytes; an unknown size is never assumed small. */
  size?: number;
  modified?: number;
  transcript?: string;
};
/** `days` (Sunday=1 … Saturday=7, ascending) is sent only when surfaceInfo reports clockRepeatDaysVersion >= 1. */
export type ClockRequest = {action:'set';hour:number;minute:number;label:string;timeZone?:string;reviewed:true;days?:ClockDay[]} | {action:'show'|'dismiss';reviewed:true} | {action:'snooze';snoozeMinutes:number;reviewed:true};
export type ClockResult = {action:ClockRequest['action'];status:'opened'|'unavailable'|'denied'|'failed'|'unknown';message:string};
export const DailyApps = registerPlugin<DailyAppsPlugin>("DailyApps");
