/**
 * Touch feedback on Android: a switch turning on or off, a confirmed delete or other removal, and a
 * long press that starts editing. Android plays it through AlphaDevice.haptic and follows the
 * owner's own touch-feedback setting; elsewhere nothing happens.
 */
export type HapticKind = 'toggle-on' | 'toggle-off' | 'confirm' | 'long-press';
export interface HapticDevice {haptic(input: {kind: HapticKind}): Promise<unknown>}

/** Confirm labels that remove or overwrite something; matches the review dialog's own list. */
export const DESTRUCTIVE_LABEL = /^(Delete|Discard|Erase|Remove|Replace|Clear|Reset|Sign out)\b/;
/** One gesture can reach two paths (a held press and Android's context menu): play it once. */
const REPEAT_MS = 300;

let device: HapticDevice | null = null, last = {kind: '', at: -Infinity};

export function haptic(kind: HapticKind, now = Date.now()) {
  if (!device || (last.kind === kind && now - last.at < REPEAT_MS)) return;
  last = {kind, at: now};
  void device.haptic({kind}).catch(() => {});
}

function disabled(control: Element) {
  return control.matches(':disabled') || control.getAttribute('aria-disabled') === 'true';
}
/** The feedback a click on this element earns, read before the control's own handler changes it. */
export function hapticForClick(target: EventTarget | null): HapticKind | null {
  if (typeof Element === 'undefined' || !(target instanceof Element)) return null;
  const control = target.closest<HTMLElement>('button,[role="switch"],[role="button"]');
  if (!control || disabled(control) || control.closest('[inert]')) return null;
  if (control.getAttribute('role') === 'switch') return control.getAttribute('aria-checked') === 'true' ? 'toggle-off' : 'toggle-on';
  // Only the confirming button of a dialog: a Delete in a list still opens its own review.
  if (!control.closest('dialog,[role="dialog"],[role="alertdialog"]')) return null;
  return control.dataset.destructive !== undefined || DESTRUCTIVE_LABEL.test((control.textContent || '').trim()) ? 'confirm' : null;
}

export function installHaptics(native: HapticDevice | null, target?: Pick<Document, 'addEventListener' | 'removeEventListener'>): () => void {
  device = native; last = {kind: '', at: -Infinity};
  if (!native) return () => {};
  const root = target ?? document;
  const click = (event: MouseEvent) => { const kind = hapticForClick(event.target); if (kind) haptic(kind); };
  root.addEventListener('click', click, true);
  return () => { root.removeEventListener('click', click, true); if (device === native) device = null; };
}
