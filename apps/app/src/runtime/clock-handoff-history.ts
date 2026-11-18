/**
 * Alpha's binding to the shared latest-Clock-handoff record. It is not an alarm database
 * or replay journal and never dispatches; validation and the stale-snapshot refusal are
 * upstream. Alpha keeps only its installed slot.
 */
import {
  createClockHandoffHistory as createSharedClockHandoffHistory,
  type ClockHandoffHistoryStorage,
} from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/clock-handoff-history.ts';
export type {ClockHandoffRecord,ClockHandoffSnapshot} from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/clock-handoff-history.ts';
export const clockHandoffSlot='clock-handoff:v1:device';
export function createClockHandoffHistory(storage:ClockHandoffHistoryStorage){
 return createSharedClockHandoffHistory({storage,slot:clockHandoffSlot});
}
