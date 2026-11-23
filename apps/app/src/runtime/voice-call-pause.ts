/**
 * Voice and phone calls. A call owns the microphone and the earpiece: the native speech bridge
 * refuses and ends capture and speech with the `call-active` code, and on the Alpha image the call
 * screen is a separate activity, so Alpha's page is paused and hidden when a call starts. Those
 * race, and the pause reports only that the microphone stopped. Telecom's reading (call-state.ts)
 * settles which it was, so a call always reads as a call and never as a voice failure.
 *
 * Nothing here reopens the microphone: voice starts again only when the owner starts it.
 */

/** Said once when a call ends a voice conversation or a dictation. */
export const VOICE_CALL_ENDED = 'Voice paused for a phone call.';
/** Said when voice is asked for while a call holds the microphone. */
export const VOICE_CALL_ACTIVE = 'Voice is paused during a phone call.';

type Reason = {code?: unknown; reason?: unknown; interrupted?: unknown} | null | undefined;

/**
 * A capture or speech failure the native side attributes to a call: a refused start or speech
 * (`code`), a capture that ended (`reason`, or the recorder's own `capture-call-active`) and a
 * clip that stopped early (`interrupted`).
 */
export function callCaused(failure: unknown): boolean {
	const value = (failure && typeof failure === 'object' ? failure : undefined) as Reason;
	return value?.code === 'call-active' || value?.code === 'capture-call-active' || value?.reason === 'call-active' || value?.interrupted === 'call-active';
}

/**
 * Whether voice that just stopped or was refused stopped for a call: the native side said so, or
 * Telecom reports a live call (the call screen's pause arrives as a plain capture loss).
 */
export function voiceEndedForCall(failure: unknown, callLive: boolean): boolean {
	return callLive || callCaused(failure);
}

/**
 * Voice closed because Alpha's page was hidden. When the page shows again the owner is told once
 * if a call was live then or since (a short call can start and end behind the call screen); a plain
 * app switch says nothing.
 */
export function createCallReturnNotice(callSeenSince: (time: number) => boolean, now: () => number = Date.now) {
	let closed: {at: number; callLive: boolean} | null = null;
	return {
		/** Voice was closed by the page hiding; `callLive` is Telecom's reading at that moment. */
		closedByHide(callLive: boolean): void { closed = {at: now(), callLive}; },
		/** The page shows again: true once when a call was live as voice closed or since. */
		returned(): boolean {
			const held = closed;
			closed = null;
			return held !== null && (held.callLive || callSeenSince(held.at));
		},
	};
}
