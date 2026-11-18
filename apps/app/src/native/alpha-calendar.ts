import type { PermissionState } from '@capacitor/core';
import type { CalendarOperation } from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/calendar-contract.ts';
import type { NamedCalendarReadProvider } from '../../../../.eliza/client-features/plugins/plugin-calendar/src/client/named-read.ts';
import type { AvailabilityProvider } from '../../../../.eliza/client-features/plugins/plugin-calendar/src/client/availability-review.ts';
import type { AndroidCalendarCreation, AndroidCalendarEvent, AndroidCalendarExpected, AndroidCalendarOptions, AndroidCalendarOptionsEvent, AndroidCalendarRow, AndroidCalendarSave, AndroidCalendarSource } from '../../../../vendor/eliza/plugins/plugin-native-calendar/src/android-definitions.ts';

/** One calendar the owner chose for workflow reads. */
export type WorkflowCalendar = { id: string; name: string; account: string; sourceRevision: string };
/** One event of a workflow range read. */
export type WorkflowCalendarEvent = { id: string; calendarId: string; title: string; start: string; end: string; allDay: boolean };
/** A calendar row as the Calendar screen lists it; the browser host adds its display preferences. */
export type CalendarListRow = AndroidCalendarRow & { visible?: boolean; color?: string };
/** The event a scoped deletion review resolved, bound to the revision it showed. */
export type CalendarDeletionTarget = { eventId: string; sourceId: string; sourceRevision: string; revision: string };

/**
 * AlphaCalendarPlugin (the shared CalendarPlugin under Alpha's name, plus scoped deletion review and
 * the availability reads). The browser host registers BrowserCalendar under the same name
 * (browser/register.ts), so this module exports no singleton.
 */
export interface AlphaCalendarPlugin extends NamedCalendarReadProvider, AvailabilityProvider {
  checkPermissions(): Promise<{ calendar: PermissionState; workflowCalendarRead: PermissionState }>;
  requestAccess(): Promise<{ status: 'granted' | 'denied' }>;
  requestWorkflowReadAccess(): Promise<{ status: 'granted' | 'denied' }>;
  list(input: { begin: number; end: number }): Promise<{ status: 'ready'; calendars: CalendarListRow[]; events: AndroidCalendarEvent[]; truncated: boolean } | { status: 'permission-required'; events?: undefined; truncated?: undefined }>;
  workflowCalendars(): Promise<{ status: 'ready'; calendars: WorkflowCalendar[] } | { status: 'permission-required'; calendars?: undefined }>;
  /** `timeZone` is read by the browser host only; Android reads the range as given. */
  readWorkflowRange(input: { calendarIds: string[]; start: string; end: string; timeZone?: string; maximumEvents: number }): Promise<{ status: 'ready'; events: WorkflowCalendarEvent[] } | { status: 'permission-required'; events?: undefined }>;
  open(input: { id: string; begin?: number; end?: number }): Promise<{ status: 'opened' }>;
  inspect(input: { id: string; calendarId: string; expected: AndroidCalendarExpected }): Promise<{ status: 'ready'; revision: string; sourceRevision: string } | { status: 'permission-required' | 'unavailable' | 'conflict' | 'external' }>;
  remove(input: { id: string; calendarId: string; expected: AndroidCalendarExpected; revision: string }): Promise<{ status: 'deleted'; id: string; calendarId: string; revision: string } | { status: 'queued'; deletion: unknown } | { status: 'permission-required' | 'unavailable' | 'busy' | 'conflict' | 'external' | 'cancelled' | 'unknown' }>;
  /** Android only: resolves the exact event (and recurrence scope) a deletion would remove. */
  inspectDeletion(input: { id: string; calendarId: string; expected: AndroidCalendarExpected; scope?: string }): Promise<({ status: 'ready' } & CalendarDeletionTarget) | { status: 'permission-required' | 'unavailable' | 'conflict' | 'external' | 'busy' }>;
  /** Android only: stages the reviewed deletion with its Undo window. */
  removeScoped(input: CalendarDeletionTarget): Promise<{ status: 'queued'; deletion: unknown } | { status: 'permission-required' | 'unavailable' | 'busy' | 'conflict' | 'external' | 'cancelled' | 'unknown' }>;
  save(input: AndroidCalendarSave): Promise<AndroidCalendarCreation | { status: 'saved'; id: string; calendarId: string } | { status: 'permission-required' | 'conflict' | 'pending-creation' }>;
  saveOptions(input: { event: AndroidCalendarOptionsEvent; calendarId?: string; creationId: string; separateCreation?: boolean }): Promise<AndroidCalendarCreation | { status: 'permission-required' | 'pending-creation' | 'read-only' }>;
  readOptions(input: { id: string }): Promise<{ status: 'ready'; allDay: boolean; timeZone: string; rrule: string; duration: string } | { status: 'permission-required' | 'missing' }>;
  /** Opening the external editor is not proof that an event was saved. */
  insertHandoff(input: { event: AndroidCalendarOptions & { allDay: boolean; attendees?: string[]; alerts?: number[] } }): Promise<{ status: 'opened'; alertsPrefilled: boolean } | { status: 'unavailable' | 'invalid' | 'unknown' }>;
  pendingCreations(): Promise<{ status: 'ready'; creations: AndroidCalendarCreation[] } | { status: 'permission-required' }>;
  acknowledgeCreation(input: { creationId: string; resolution?: 'dismissed' }): Promise<{ status: 'acknowledged' | 'dismissed' | 'permission-required' }>;
  prepareAgentSource(): Promise<({ status: 'ready' } & AndroidCalendarSource) | { status: 'permission-required' | 'unavailable' }>;
  executeAgent(input: { operation: CalendarOperation; operationId: string; journalIdentity?: { scope: string; proposalId: string } }): Promise<{ status: string; result?: unknown }>;
  cancelAgent(input: { operationId: string }): Promise<{ status: 'cancelled' }>;
}

/** Methods only the browser development host (BrowserCalendar) implements. Android has none of them;
 * every caller guards them with `!Capacitor.isNativePlatform()`. */
export interface AlphaCalendarBrowserMethods {
  changePreferences(input: { action: 'visibility' | 'color' }): Promise<unknown>;
  edit(input: { id: string; revision: string; people?: { id: string; name: string }[] }): Promise<{ status: string }>;
  editSeries(input: { id: string; revision: string; people?: { id: string; name: string }[] }): Promise<{ status: string }>;
  removeSeries(input: { id: string; revision: string }): Promise<{ status: string }>;
  editResponse(input: { id: string; revision: string; person: string; name: string }): Promise<{ status: string }>;
  joinMeeting(input: { id: string; revision: string; people?: string[] }): Promise<unknown>;
  readAgenda(input: { operationId: string; source: unknown; operation: unknown }): Promise<{ status: string; events: unknown[] }>;
}
