/**
 * AP-16 AC-19 on the Alpha image: whether a call is live and whether it may be an emergency call,
 * from Telecom through the AlphaDevice plugin (android AlphaCallState.java). The system call screen
 * owns every call, so this is the only way the WebView learns that one is live. Read-only.
 *
 * The rule is native: a live call that cannot be ruled out as an emergency call holds AC-19. While
 * it holds, Alpha offers and runs no action (comms-bar emergency source, executor guards).
 */
import {setEmergencySource} from './comms-bar';

export type CallState = {inCall: boolean | null; emergency: boolean | null; emergencyLive: boolean};
export type CallStatePlugin = {
	callState(): Promise<unknown>;
	addListener(event: 'callState', listener: (value: unknown) => void): Promise<{remove(): Promise<void> | void}>;
};

const UNKNOWN: CallState = {inCall: null, emergency: null, emergencyLive: false};
const tri = (value: unknown) => value === null || typeof value === 'boolean';

/** The exact native shape, or null. */
export function parseCallState(value: unknown): CallState | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	const row = value as Record<string, unknown>;
	if (Object.keys(row).sort().join(',') !== 'emergency,emergencyLive,inCall') return null;
	if (!tri(row.inCall) || !tri(row.emergency) || typeof row.emergencyLive !== 'boolean') return null;
	const state = {inCall: row.inCall as boolean | null, emergency: row.emergency as boolean | null, emergencyLive: row.emergencyLive};
	// The rule is re-derived here: a payload that contradicts it is not trusted to lift AC-19.
	return {...state, emergencyLive: state.emergencyLive || state.inCall === true && state.emergency !== false};
}

let current: CallState = UNKNOWN;
export const currentCallState = (): CallState => current;

/** A fresh native reading, for a guard right before a side effect. A failed read keeps the last one. */
export async function readCallState(plugin: CallStatePlugin): Promise<CallState> {
	try {
		const parsed = parseCallState(await plugin.callState());
		if (parsed) current = parsed;
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
		current = parsed;
		if (JSON.stringify(current) !== before) changed();
	}).then(registered => { if (live) handle = registered; else void registered.remove(); }, () => {});
	const visible = () => { if (!document.hidden) void refresh(); };
	document.addEventListener('visibilitychange', visible);
	void refresh();
	return () => {
		live = false;
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

/** The executor's AC-19 guard: a fresh reading right before a telephony side effect. */
export async function telephonyEffectAllowed(plugin: CallStatePlugin): Promise<boolean> {
	return !(await readCallState(plugin)).emergencyLive;
}
