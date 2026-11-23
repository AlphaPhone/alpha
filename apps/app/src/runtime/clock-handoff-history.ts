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
/**
 * Alpha no longer reads the retired plain key, but envelopes written while it existed carry
 * its bytes in `legacy`. Those envelopes are still the current format, so they are read as
 * `legacy:null` (the shared check would otherwise refuse every read), and the original stored
 * value is handed back as the compare-and-set expectation so the next save rewrites the slot.
 */
function withoutLegacyCopy(storage:ClockHandoffHistoryStorage):ClockHandoffHistoryStorage{
 const original=new WeakMap<object,unknown>();
 return {
  async read<T>(slot:string){
   const stored=await storage.read<unknown>(slot);
   if(!stored||typeof stored!=='object'||Array.isArray(stored)||typeof (stored as {legacy?:unknown}).legacy!=='string')return stored as T|null;
   const current={...stored,legacy:null};
   original.set(current,stored);
   return current as T;
  },
  compareExchange(slot,expected,value){
   const raw=expected&&typeof expected==='object'&&original.has(expected)?original.get(expected):expected;
   return storage.compareExchange(slot,raw??null,value);
  },
 };
}
export function createClockHandoffHistory(storage:ClockHandoffHistoryStorage){
 return createSharedClockHandoffHistory({storage:withoutLegacyCopy(storage),slot:clockHandoffSlot});
}
