/**
 * Alpha's bindings to the shared external Clock handoff policy. Android Clock owns
 * alarms (P-17): a handoff receipt proves only that Clock opened, never that an
 * alarm exists, changed or rang. Validation and capability policy are upstream;
 * the review text, repeat-day names and the phone form are Alpha's
 * (ui/clock/clock-handoff-presentation.ts).
 */
import {
  assertClockHandoffTimeZone,
  clockHandoffReceipt,
  isClockHandoffOperation,
  validateClockHandoffDispatch,
  validateClockHandoffResult,
} from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/clock-handoff.ts';
import type {ClockHandoffOperation} from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/clock-contract.ts';
import {
  buildClockHandoffRequest,
  clockHandoffFormDays,
  describeClockHandoff as describeAlphaClockHandoff,
} from '../ui/clock/clock-handoff-presentation';
export {CLOCK_CAPABILITY, clockTimeZone} from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/clock-contract.ts';
export type {ClockDay, ClockHandoffOperation as ClockOperation, ClockHandoffResult as ClockResult, ClockHandoffResult} from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/clock-contract.ts';
export {clockHandoffCapabilities, currentClockTimeZone} from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/clock-handoff.ts';
export {CLOCK_DAY_NAMES, describeClockDays} from '../ui/clock/clock-handoff-presentation';
export type {ClockHandoffSetRequest as ClockSetRequest, ClockHandoffRequest as ClockDraftRequest} from '../ui/clock/clock-handoff-presentation';

/** Alpha's Clock form: one to seven unique days, ascending for EXTRA_DAYS. */
export const clockDays = clockHandoffFormDays;
export const isClockOperation = isClockHandoffOperation;
/** Handoffs only; an explicit empty repeat is dispatched as a one-time alarm. */
export const validateClockOperation = validateClockHandoffDispatch;
export const validateClockOutcome = validateClockHandoffResult;
/** Bind a native dispatcher reply ({status}) to its typed handoff receipt. */
export const validateClockResult = clockHandoffReceipt;
export const buildClockRequest = buildClockHandoffRequest;
export function assertClockTimeZone(operation: ClockHandoffOperation, observed: string | undefined) {
  assertClockHandoffTimeZone(operation, observed);
}
export function describeClockHandoff(operation: ClockHandoffOperation): string {
  return describeAlphaClockHandoff(operation, 'Alpha');
}
