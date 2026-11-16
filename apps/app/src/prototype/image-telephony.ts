/**
 * AP-16 AC-19: the Alpha image's telephony side effects, each behind the fail-closed Telecom guard
 * read immediately before it, with the review fence run again after that read. agent-adapter.ts
 * runs every image dial handoff, direct SMS send and telephony action through these functions;
 * the native client and plugins are its parameters, so tests drive the same code with the bridge
 * faked.
 */
import {guardTelephonyPorts} from '../runtime/call-state';
import {executeTelephonyAction, type TelephonyPorts} from '../runtime/telephony-executor';
import type {TelephonyActionOperation} from '../../../../.eliza/client-features/plugins/plugin-assistant/src/services/device-actions/telephony-actions-contract.ts';

export const EMERGENCY_REFUSAL = 'Nothing was done during a call that may be an emergency call.';

export type ImageGuard = {
	/** The AC-19 guard: a fresh Telecom reading allows it (runtime/call-state.ts telephonyEffectAllowed). */
	allowed: () => Promise<boolean>;
	/** Throws when the review this effect belongs to is no longer current. */
	fence: () => void;
};

/** Runs `effect` only if the guard allows it right now and the review is still current; null when refused. */
export async function guardedEffect<T>(guard: ImageGuard, effect: () => Promise<T>): Promise<T | null> {
	guard.fence();
	if (!(await guard.allowed())) return null;
	guard.fence();
	return effect();
}

/** A reviewed dial handoff: the system dial screen opens with the approved number. */
export function imageDialHandoff<T>(number: string, dial: (number: string) => Promise<T>, guard: ImageGuard): Promise<T | null> {
	return guardedEffect(guard, () => dial(number));
}

/** A reviewed direct SMS send through the native review. */
export function imageSmsSend<T>(send: () => Promise<T>, guard: ImageGuard): Promise<T | null> {
	return guardedEffect(guard, send);
}

/** A telephony action (call, text to a contact, contact write): every side-effect port is guarded. */
export function imageTelephonyAction(operation: TelephonyActionOperation, operationId: string, ports: TelephonyPorts, guard: Pick<ImageGuard, 'allowed'>, signal: AbortSignal) {
	return executeTelephonyAction(operation, operationId, guardTelephonyPorts(ports, guard.allowed), signal);
}
