/**
 * Owner issue 4: a call keeps going when the owner leaves the call screen, so a bar at the top of
 * every other view says what the call is doing and offers Return to call and End call (Decline for
 * a ringing call), like Android's and iOS's call chips. It goes when the call ends.
 *
 * Two sources, never both:
 * - The Alpha image: Alpha's InCallService holds Telecom's calls and AlphaCallActivity is the call
 *   screen, a separate activity, so every WebView view is "not the call screen". The AlphaOngoingCall
 *   plugin (android AlphaOngoingCallPlugin.java) reports each call's ID, state and connect time, and
 *   its showCall and endCall are the call notice's open and the call screen's Decline and End.
 * - The development phone (prototype model.js, Phone's `callBar`): its simulated call screen is the
 *   Phone view, so the bar shows on every other view and returns there. It never reaches a radio.
 *
 * The bar says what the call screen says: "Calling…" until Telecom reports the call ACTIVE (dialing
 * and connecting both report `dialing`), "Incoming call" while it rings, and "On call · m:ss" counted
 * from the connect time Android reports (Call.Details.getConnectTimeMillis), never from when the bar
 * appeared. When the call goes, the bar keeps its place for CALL_ENDED_HOLD_MS saying "Call ended",
 * and its controls do nothing, so a tap aimed at it as the call ends does not reach the view the
 * collapsing bar would otherwise uncover underneath (owner report, v609).
 */
type Bag = Record<string, any>;

export type OngoingCallState = 'dialing' | 'ringing' | 'active' | 'held';
export type OngoingCall = {id: string; state: OngoingCallState; connectedAt: number | null};
type Handle = {remove(): Promise<void> | void};
export type OngoingCallPlugin = {
	ongoingCall(): Promise<unknown>;
	showCall(input: {id: string}): Promise<unknown>;
	endCall(input: {id: string}): Promise<unknown>;
	addListener(event: 'ongoingCall', listener: (value: unknown) => void): Promise<Handle>;
};
/** What the development phone's `callBar` hook returns for its one call. */
export type PrototypeCall = {state: OngoingCallState; connectedAt: number | null; end(): void};

const STATES: readonly string[] = ['dialing', 'ringing', 'active', 'held'];
const exactKeys = (row: Record<string, unknown>, keys: string) => Object.keys(row).sort().join(',') === keys;

/** The exact native shape, or null: a reading with anything else in it is not shown. */
export function parseOngoingCalls(value: unknown): OngoingCall[] | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	const root = value as Record<string, unknown>;
	if (!exactKeys(root, 'calls') || !Array.isArray(root.calls) || root.calls.length > 8) return null;
	const calls: OngoingCall[] = [];
	for (const item of root.calls) {
		if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
		const row = item as Record<string, unknown>;
		if (!exactKeys(row, 'connectedAt,id,state')) return null;
		if (typeof row.id !== 'string' || !row.id || row.id.length > 64 || typeof row.state !== 'string' || !STATES.includes(row.state)) return null;
		const at = row.connectedAt;
		if (at !== null && !(typeof at === 'number' && Number.isFinite(at) && at > 0)) return null;
		calls.push({id: row.id, state: row.state as OngoingCallState, connectedAt: at});
	}
	return calls;
}

/** The call the bar is about: a ringing call needs the owner first, then the connected one. */
export function shownCall(calls: readonly OngoingCall[]): OngoingCall | null {
	for (const state of ['ringing', 'active', 'held', 'dialing'] as const) {
		const call = calls.find(row => row.state === state);
		if (call) return call;
	}
	return null;
}

/** `m:ss`, or `h:mm:ss` from one hour, as the call screen writes it. */
export function callClock(millis: number): string {
	const total = Math.floor(Math.max(0, millis) / 1000), hours = Math.floor(total / 3600);
	const minutes = Math.floor(total % 3600 / 60), seconds = String(total % 60).padStart(2, '0');
	return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

/**
 * What the bar says about the call. Only an active call has a clock, and it counts from the connect
 * time the call reports; a dialing or ringing call never shows one, whatever time it carries.
 */
export function callBarStatus(state: OngoingCallState, connectedAt: number | null, now: number): string {
	if (state === 'ringing') return 'Incoming call';
	if (state === 'dialing') return 'Calling…';
	if (state === 'held') return 'On hold';
	return connectedAt ? `On call · ${callClock(now - connectedAt)}` : 'On call';
}

export type CallBar = {status: string; returnLabel: string; endLabel: string; ended: boolean; announcement: string; open(): void; end(): void};
export function presentCallBar(call: {state: OngoingCallState; connectedAt: number | null}, now: number, open: () => void, end: () => void): CallBar {
	const status = callBarStatus(call.state, call.connectedAt, now);
	return {status, returnLabel: `Return to call, ${status}`, endLabel: call.state === 'ringing' ? 'Decline' : 'End call', ended: false, announcement: '', open, end};
}

/** How long an ended call's bar keeps its place, swallowing taps, before the screen moves back up. */
export const CALL_ENDED_HOLD_MS = 1500;
const ignore = () => {};
const callEndedStatus = 'Call ended';
/** The ended call's bar: same place and size, nothing to press, and a status a screen reader hears. */
export const ENDED_CALL_BAR: Readonly<CallBar> = Object.freeze({
	status: callEndedStatus, returnLabel: callEndedStatus, endLabel: callEndedStatus,
	ended: true, announcement: callEndedStatus, open: ignore, end: ignore,
});

/** Whether the last frame showed a call and when an ended bar expires. */
type CallBarMemory = {shown: boolean; endedUntil: number};
const EMPTY_CALL_BAR: Readonly<CallBarMemory> = Object.freeze({shown: false, endedUntil: 0});
/**
 * The bar's phase for this frame.
 * @param live whether the bar has a live call to show.
 * @param eligible the bar may show at all here (screen on, not the assistant, not the call screen).
 *   Leaving those places is not a call ending: the bar just goes.
 * @param trusted the last reading was well formed. A reading the bar cannot trust removes the bar at
 *   once rather than claiming the call ended.
 */
export function nextCallBarPhase(memory: CallBarMemory, live: boolean, eligible: boolean, trusted: boolean, now: number): {phase: 'live' | 'ended' | 'none'; memory: CallBarMemory} {
	if (!eligible || !trusted) return {phase: 'none', memory: EMPTY_CALL_BAR};
	if (live) return {phase: 'live', memory: {shown: true, endedUntil: 0}};
	if (memory.shown) return {phase: 'ended', memory: {shown: false, endedUntil: now + CALL_ENDED_HOLD_MS}};
	if (memory.endedUntil > now) return {phase: 'ended', memory};
	return {phase: 'none', memory: EMPTY_CALL_BAR};
}

/**
 * Adds `hasCallBar` and `callBar` to the shell's render values. With a plugin (the image) the calls
 * come from Telecom; without one, from the development phone's `callBar` hook, hidden on the Phone
 * view, which is that phone's call screen.
 */
export function installOngoingCallBar(Component: any, views: Bag, plugin: OngoingCallPlugin | null): void {
	const p = Component.prototype, render = p.renderVals, mount = p.componentDidMount, unmount = p.componentWillUnmount;
	let calls: OngoingCall[] = [], generation = 0, ending: string | null = null, trusted = true;
	let memory: CallBarMemory = EMPTY_CALL_BAR, collapse: ReturnType<typeof setTimeout> | undefined;
	const owners = new Set<any>();
	const redraw = () => { for (const owner of owners) if (owner.live !== false) owner.setState({ongoingCallRevision: Date.now()}); };
	const apply = (reading: OngoingCall[] | null) => {
		const next = reading ?? [];
		const wellFormed = reading !== null;
		if (wellFormed === trusted && JSON.stringify(next) === JSON.stringify(calls)) return;
		calls = next;
		trusted = wellFormed;
		if (ending && !calls.some(call => call.id === ending)) ending = null;
		redraw();
	};
	const refresh = async () => {
		if (!plugin || !owners.size) return;
		const started = ++generation;
		try {
			const reading = await plugin.ongoingCall();
			if (started === generation) apply(parseOngoingCalls(reading));
		}
		catch { /* keep the last reading */ }
	};
	let stop: (() => void) | null = null;
	const start = () => {
		if (!plugin || stop) return;
		let live = true, handle: Handle | null = null;
		void plugin.addListener('ongoingCall', value => {
			// A reading the bar cannot trust removes the bar rather than showing a stale call.
			if (!live) return;
			generation++;
			apply(parseOngoingCalls(value));
		}).then(registered => { if (live) handle = registered; else void registered.remove(); }, () => {});
		const visible = () => { if (!document.hidden) void refresh(); };
		document.addEventListener('visibilitychange', visible);
		void refresh();
		stop = () => {
			live = false; document.removeEventListener('visibilitychange', visible); void handle?.remove();
			generation++;
			calls = []; ending = null; trusted = true; memory = EMPTY_CALL_BAR;
			if (collapse) { clearTimeout(collapse); collapse = undefined; }
		};
	};
	// The connected clock advances once a second while the bar shows it.
	let ticker: ReturnType<typeof setInterval> | undefined;
	const tick = (running: boolean) => {
		if (running && !ticker) ticker = setInterval(redraw, 1000);
		else if (!running && ticker) { clearInterval(ticker); ticker = undefined; }
	};

	p.renderVals = function () {
		const out = render.call(this), self = this, now = Date.now();
		let bar: Readonly<CallBar> | null = null, clock = false, eligible = false;
		if (out.isOn && !out.assistantSurface) {
			if (plugin) {
				eligible = true;
				const call = shownCall(calls);
				if (call) {
					clock = call.state === 'active' && !!call.connectedAt;
					bar = presentCallBar(call, now,
						() => { void plugin.showCall({id: call.id}).catch(() => {}); },
						() => {
							if (ending === call.id) return;
							ending = call.id;
							void plugin.endCall({id: call.id}).then(refresh, () => { ending = null; void refresh(); });
						});
				}
			} else if (self.S().view !== 'phone' && typeof views.phone?.callBar === 'function') {
				eligible = true;
				const call: PrototypeCall | null = views.phone.callBar(self.vget('phone'), self.api('phone'));
				// The development phone ticks its own clock once a second while a call is live.
				if (call) {
					bar = presentCallBar(call, now, () => self.openView('phone', null, null, {restore: true}), call.end);
				}
			}
		}
		const next = nextCallBarPhase(memory, bar !== null, eligible, trusted, now);
		if (next.memory.endedUntil !== memory.endedUntil) {
			if (collapse) clearTimeout(collapse);
			collapse = next.memory.endedUntil ? setTimeout(() => { collapse = undefined; redraw(); }, next.memory.endedUntil - now + 20) : undefined;
		}
		memory = next.memory;
		if (next.phase === 'ended') { bar = ENDED_CALL_BAR; clock = false; }
		tick(clock);
		return {...out, hasCallBar: !!bar, callBar: bar || {}};
	};
	p.componentDidMount = function (...args: unknown[]) {
		mount?.apply(this, args);
		owners.add(this);
		start();
	};
	p.componentWillUnmount = function (...args: unknown[]) {
		owners.delete(this);
		if (!owners.size) { stop?.(); stop = null; tick(false); }
		unmount?.apply(this, args);
	};
}
