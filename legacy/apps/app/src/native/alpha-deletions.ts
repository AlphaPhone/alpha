import type { DeferredDeletionEntry, DeferredDeletionKey, DeferredDeletionsBridge } from '../../../../.eliza/client-features/packages/contracts/src/deletion-window';
import type { DeviceJournalEntry } from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/client-coordinator.ts';

/** A pending Calendar or reminder deletion row (the shared deletion-window contract). */
export type DeletionEntry = DeferredDeletionEntry & { kind: 'calendar' | 'reminder' };
/** The recovered outcome of a journalled deletion. */
export type DeletionRecovery = { status: 'succeeded' | 'failed'; summary: string; result: Record<string, unknown> };

/**
 * AlphaDeletionsPlugin: the shared reviewed deletion Undo window for Calendar events and reminders.
 * The browser host registers BrowserDeletions under the same name (browser/register.ts), so this
 * module exports no singleton.
 */
export interface AlphaDeletionsPlugin extends DeferredDeletionsBridge {
  pending(): Promise<{ deletions: DeletionEntry[]; deletedOrigins?: Array<{ kind: 'event' | 'reminder'; id: string }> }>;
  undo(input: DeferredDeletionKey): Promise<{ phase?: string }>;
  reviewReminder(input: { target: unknown }): Promise<{ status: string }>;
  reviewAgentReminder(input: { operation: unknown; operationId: string; bindingHash: string; journalIdentity: unknown }): Promise<{ status: string }>;
  /** Browser host only: Android recovers deletions through AlphaActionJournal and has no such method. */
  receipt?(input: { entry: DeviceJournalEntry }): Promise<{ recovery: DeletionRecovery | null }>;
}
