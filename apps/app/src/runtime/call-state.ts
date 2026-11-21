/**
 * AP-16 AC-19 on the Alpha image: whether a call is live and whether it may be an emergency call,
 * from Telecom through the AlphaCallState plugin (android AlphaCallState.java). The system call
 * screen owns every call, so this is the only way the WebView learns that one is live. Read-only.
 *
 * Two uses, two failure rules:
 * - Display (the comms-bar emergency source): a live call that cannot be ruled out as an emergency
 *   call holds AC-19; with no call or no readable state the shell keeps working, so a lost bridge
 *   never freezes proposals for good. The last good reading stays until a newer one arrives.
 * - Side effects (telephonyEffectAllowed, guardTelephonyPorts): fail closed. A dial, dial handoff,
 *   SMS send or contact write runs only on a fresh reading that parses, knows whether a call is
 *   live, and rules out an emergency call.
 */
import {setEmergencySource} from './comms-bar';

export type CallState = {inCall: boolean | null; emergency: boolean | null; emergencyLive: boolean; watching: boolean};
export type CallStatePlugin = {
	callState(): Promise<unknown>;
	addListener(event: 'callState', listener: (value: unknown) => void): Promise<{remove(): Promise<void> | void}>;
};

const UNKNOWN: CallState = {inCall: null, emergency: null, emergencyLive: false, watching: false};
const tri = (value: unknown) => value === null || typeof value === 'boolean';

/** The exact native shape, or null. */
export function parseCallState(value: unknown): CallState | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	const row = value as Record<string, unknown>;
	if (Object.keys(row).sort().join(',') !== 'emergency,emergencyLive,inCall,watching') return null;
	if (!tri(row.inCall) || !tri(row.emergency) || typeof row.emergencyLive !== 'boolean' || typeof row.watching !== 'boolean') return null;
	const state = {inCall: row.inCall as boolean | null, emergency: row.emergency as boolean | null, emergencyLive: row.emergencyLive, watching: row.watching};
	// The rule is re-derived here: a payload that contradicts it is not trusted to lift AC-19.
	return {...state, emergencyLive: state.emergencyLive || state.inCall === true && state.emergency !== false};
}

let current: CallState = UNKNOWN;
/** Each listener event advances this; a read that began before the latest event is not applied. */
let generation = 0;
export const currentCallState = (): CallState => current;

/** A fresh native reading for the display. A failed read keeps the last one. */
export async function readCallState(plugin: CallStatePlugin): Promise<CallState> {
	const started = generation;
	try {
		const parsed = parseCallState(await plugin.callState());
		if (parsed && started === generation) current = parsed;
	} catch {
		// keep the last reading
	}
	return current;
}

/**
 * Follows the native state: a read now, on every Telephony call-state change and whenever Alpha
 * returns to the foreground. `changed` redraws the shell. Returns the stop function.
 */
export function watchCallState(plugin: CallStatePlugin, changed: () => void): () => void {
	let live = true, handle: {remove(): Promise<void> | void} | null = null;
	setEmergencySource(() => current.emergencyLive);
	const refresh = async () => {
		const before = JSON.stringify(current);
		await readCallState(plugin);
		if (live && JSON.stringify(current) !== before) changed();
	};
	void plugin.addListener('callState', value => {
		const parsed = parseCallState(value);
		if (!parsed || !live) return;
		const before = JSON.stringify(current);
		generation++;
		current = parsed;
		if (JSON.stringify(current) !== before) changed();
	}).then(registered => { if (live) handle = registered; else void registered.remove(); }, () => {});
	const visible = () => { if (!document.hidden) void refresh(); };
	document.addEventListener('visibilitychange', visible);
	// Until Telephony's listener is registered (phone-state access can arrive later), poll while in front.
	const poll = setInterval(() => { if (!document.hidden && !current.watching) void refresh(); }, 4000);
	void refresh();
	return () => {
		live = false;
		clearInterval(poll);
		document.removeEventListener('visibilitychange', visible);
		void handle?.remove();
		setEmergencySource(null);
		current = UNKNOWN;
	};
}

/** Follows the native call state for each mounted shell and redraws it on a change (image only). */
export function installCallStateWatch(Component: any, plugin: CallStatePlugin): void {
	const p = Component.prototype, mount = p.componentDidMount, unmount = p.componentWillUnmount;
	p.componentDidMount = function (...args: unknown[]) {
		mount?.apply(this, args);
		this.callStateStop = watchCallState(plugin, () => { if (this.live !== false) this.setState({}); });
	};
	p.componentWillUnmount = function (...args: unknown[]) {
		this.callStateStop?.();
		this.callStateStop = undefined;
		unmount?.apply(this, args);
	};
}

/** The executor's AC-19 guard: true only on a fresh reading that parses, says whether a call is live,
 * and rules out an emergency call. A failed or malformed read, or unknown state, refuses (fail closed). */
export async function telephonyEffectAllowed(plugin: CallStatePlugin): Promise<boolean> {
	let state: CallState | null;
	const started = generation;
	try {
		state = parseCallState(await plugin.callState());
	} catch {
		return false;
	}
	if (!state) return false;
	// A Telephony event that arrived during the read is newer: it can only add a refusal.
	if (started === generation) current = state;
	else if (current.emergencyLive || current.inCall === null) return false;
	return state.inCall !== null && !state.emergencyLive;
}

type SideEffectPorts = {
	current(): void;
	placeCall(number: string): Promise<{status: string}>;
	sendSms(number: string, body: string, operationId: string, signal: AbortSignal): Promise<string>;
	saveContact(draft: never, target?: never): Promise<{status: string}>;
	removeContact(id: string, version: string): Promise<{status: string}>;
};
/**
 * The image executor's side-effect ports, each behind the fail-closed guard read right before it. The
 * read is awaited, so the executor's fence (ports.current(), and the send's abort signal) runs again
 * after it: nothing acts for a review that ended while Telecom was being read.
 */
export function guardTelephonyPorts<T extends SideEffectPorts>(ports: T, allowed: () => Promise<boolean>): T {
	const cleared = async (signal?: AbortSignal) => {
		const ok = await allowed();
		signal?.throwIfAborted();
		ports.current();
		return ok;
	};
	return {...ports,
		// A refusal is the phone's, not another call the owner is on or the owner's dismissal.
		placeCall: async (number: string) => await cleared() ? ports.placeCall(number) : {status: 'unavailable'},
		sendSms: async (number: string, body: string, operationId: string, signal: AbortSignal) => await cleared(signal) ? ports.sendSms(number, body, operationId, signal) : 'unavailable',
		saveContact: async (draft: never, target?: never) => await cleared() ? ports.saveContact(draft, target) : {status: 'failed'},
		removeContact: async (id: string, version: string) => await cleared() ? ports.removeContact(id, version) : {status: 'failed'},
	} as T;
}
