import { registerPlugin } from '../platform-plugins';
import type { DeviceActionJournal } from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/client-coordinator.ts';
import type { ClockReviewBridge } from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/clock-review-executor';

/**
 * The shared ActionJournalPlugin under Alpha's name, with Alpha's native recovery readers and the
 * native Clock review. Alpha implements every recovery reader the shared journal leaves optional.
 */
export type AlphaActionJournalPlugin = DeviceActionJournal & Required<Pick<DeviceActionJournal, 'recoverNotification' | 'recoverDeletion' | 'recoverReminder'>> & ClockReviewBridge;
export const alphaActionJournal = registerPlugin<AlphaActionJournalPlugin>('AlphaActionJournal');
