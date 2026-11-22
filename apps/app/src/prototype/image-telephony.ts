/**
 * AP-16 AC-19: the Alpha image's telephony side effects, each behind the fail-closed Telecom guard
 * read immediately before it, with the review fence run again after that read. agent-adapter.ts
 * runs every image dial handoff, direct SMS send and telephony action through these functions;
 * the native client and plugins are its parameters, so tests drive the same code with the bridge
 * faked.
 */
import {guardTelephonyPorts} from '../runtime/call-state';
import {contactsChanged} from './contacts-changes';
import {executeTelephonyAction, type TelephonyPorts} from '../runtime/telephony-executor';
import {reviewSms, type AospTelephony} from '../runtime/aosp-telephony';
import {smsSubscriptionRevision} from '../runtime/sms-subscription-revision';
import {parseContactDetail, parseContactRemove, parseContactSave} from '../../../../.eliza/client-features/packages/contracts/src/native-address-book.ts';
import {SmsSendNotAttempted} from '../../../../.eliza/client-features/packages/contracts/src/native-telephony.ts';
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

/** A direct SMS send of the text the owner approved on its card. */
export function imageSmsSend<T>(send: () => Promise<T>, guard: ImageGuard): Promise<T | null> {
	return guardedEffect(guard, send);
}

/**
 * A telephony action (call, text to a contact, contact write): every side-effect port is guarded.
 * A guard refusal is reported in the guard's own words, and a contact write that reached the
 * address book (or may have) is announced so an open Contacts view reads it again.
 */
export async function imageTelephonyAction(operation: TelephonyActionOperation, operationId: string, ports: TelephonyPorts, guard: Pick<ImageGuard, 'allowed'>, signal: AbortSignal) {
	let refused = false;
	const allowed = async () => { const ok = await guard.allowed(); refused ||= !ok; return ok; };
	const execution = await executeTelephonyAction(operation, operationId, guardTelephonyPorts(ports, allowed), signal);
	const result = execution.telephonyResult;
	if (result.kind === 'contact-write' && (result.status === 'saved' || result.status === 'deleted' || result.status === 'unknown'))
		contactsChanged({unconfirmed: result.status === 'unknown'});
	return refused ? {...execution, summary: EMERGENCY_REFUSAL} : execution;
}

/** How long a text Android has only handed to the carrier is watched for the radio's answer. */
export const SMS_SETTLE = {reads: 6, everyMs: 500};
const pauseFor = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
	if (signal.aborted) { reject(signal.reason); return; }
	const stop = () => { clearTimeout(timer); reject(signal.reason); };
	const timer = setTimeout(() => { signal.removeEventListener('abort', stop); resolve(); }, ms);
	signal.addEventListener('abort', stop, {once: true});
});
type SmsClient = Pick<AospTelephony, 'status' | 'sendSms' | 'smsSendResult' | 'cancelSmsReview'>;
type SimContext = {view?: unknown; selectedObject?: {kind?: unknown; id?: unknown; revision?: unknown} | null};
/**
 * The executor's `sendSms` port: the same journalled native send as a text to a number. The card
 * the owner approved is the confirmation (`client` names its journal entry, approvedCardTelephony),
 * so no dialog follows. It answers what was observed. Every refusal before the send is definite
 * ("unavailable": nothing was sent), including Android's refusal of a text that is not the
 * card's; it throws only when the send's own answer was lost.
 */
export function imageSmsPort(client: SmsClient, context: SimContext, current: () => void, pause: (ms: number, signal: AbortSignal) => Promise<void> = pauseFor): TelephonyPorts['sendSms'] {
	return async (number, body, id, signal) => {
		let checked: ReturnType<typeof reviewSms>;
		try {
			const status = await client.status(); current();
			const sim = context.view === 'messages' && context.selectedObject?.kind === 'sms-subscription' ? context.selectedObject : null;
			const selected = sim && status.subscriptions?.find(row => String(row.id) === sim.id && smsSubscriptionRevision(row) === sim.revision);
			if (sim && !selected) return 'unavailable';
			// Outside Messages no SIM is selected: a phone with several uses Android's default SMS
			// SIM, as the card says.
			checked = reviewSms({recipients: [number], body, subscriptionId: selected ? selected.id : status.defaultSmsSubscriptionId ?? undefined}, status, 'direct');
		} catch { return 'unavailable'; }
		if ('problem' in checked || checked.review.subscriptionId === null) return 'unavailable';
		const review = {...checked.review, subscriptionId: checked.review.subscriptionId};
		const cancel = () => { void client.cancelSmsReview(id).catch(() => {}); };
		signal.addEventListener('abort', cancel, {once: true});
		try {
			let native: Awaited<ReturnType<SmsClient['sendSms']>>;
			try { native = await client.sendSms(review, id); }
			catch (error) {
				// A send that was never attempted, a request the client refused and a coded native
				// rejection (such as "not-approved") all happen before the send: nothing was sent. Any other throw is a lost answer.
				if (error instanceof SmsSendNotAttempted || error instanceof RangeError || typeof (error as {code?: unknown} | null)?.code === 'string') return 'unavailable';
				throw error;
			}
			// Android answers "submitted" before the radio does. The send record is read for a few
			// seconds so a message the radio refused (no service, airplane mode) is not reported as handed over.
			for (let read = 0; native.status === 'submitted' && read < SMS_SETTLE.reads; read++) {
				try { await pause(SMS_SETTLE.everyMs, signal); native = await client.smsSendResult(review, id); } catch { break; }
			}
			// "denied" is the phone's refusal (no send access, SIM inactive, too long), not the owner's dismissal.
			return native.status === 'denied' ? 'unavailable' : native.status;
		} finally { signal.removeEventListener('abort', cancel); }
	};
}

type AddressBook = {
	status(): Promise<unknown>; requestPermissions(): Promise<unknown>;
	get(options: {id: string}): Promise<unknown>; save(options: object): Promise<unknown>; remove(options: {id: string; version: string}): Promise<unknown>;
};
/**
 * The executor's contact ports over the native address book. Write access is asked for when a
 * write needs it, as the Contacts editor does; without it the write is refused with the same coded
 * rejection the address book uses, which the executor reports as "nothing was changed".
 */
export function imageContactPorts(book: AddressBook, current: () => void): Pick<TelephonyPorts, 'getContact' | 'saveContact' | 'removeContact'> {
	const granted = (access: unknown) => { const a = access as {available?: unknown; readable?: unknown; writable?: unknown} | null; return a?.available === true && a.readable === true && a.writable === true; };
	const refusal = (code: string) => Object.assign(Error('Contacts cannot be changed right now'), {code});
	const writable = async () => {
		let access: unknown = null;
		try { access = await book.status(); if (!granted(access)) access = await book.requestPermissions(); } catch { throw refusal('unavailable'); }
		try { current(); } catch { throw refusal('unavailable'); }
		if (!granted(access)) throw refusal('permission-required');
	};
	return {
		getContact: async id => parseContactDetail(await book.get({id}), id),
		saveContact: async (draft, target) => { await writable(); return {status: parseContactSave(await book.save(target ? {id: target.id, version: target.version, ...draft} : draft), target?.id).status}; },
		removeContact: async (id, version) => { await writable(); return parseContactRemove(await book.remove({id, version})); },
	};
}
