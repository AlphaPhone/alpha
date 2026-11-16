// Composer sizing for the AP-16 bar fields. Kept out of chat-overlay-motion-adapter.ts, whose
// decision regions LemmaScript extracts and verifies; this DOM bookkeeping is not part of that proof.
/** Composer heights last set, so an unchanged composer is not laid out again on every update. */
const sizedComposers = new WeakMap<HTMLTextAreaElement, { value: string; width: number; height: string }>();
/** AC-11: each bar field is as tall as its text, from 44px up to its CSS cap, then scrolls inside. */
export function sizeComposers(): void {
	for (const input of document.querySelectorAll<HTMLTextAreaElement>("textarea[data-alpha-composer]")) {
		const value = input.value,
			width = input.clientWidth,
			last = sizedComposers.get(input);
		if (last && last.value === value && last.width === width && last.height === input.style.height) continue;
		input.style.height = "44px";
		input.style.height = `${Math.max(44, input.scrollHeight)}px`;
		sizedComposers.set(input, { value, width, height: input.style.height });
	}
}
