/**
 * Predictive Back. While the owner holds Android's Back gesture, the sheet or dialog that Back
 * would close shrinks a little and moves away from the edge being swiped. Letting go closes it the
 * usual way ('alpha-back'); cancelling the gesture puts it back. MainActivity sends the gesture as
 * 'alpha-back-preview' (backPreviewScript). Nothing is previewed when Back would close a menu or
 * leave a view, or when the owner asks for reduced motion.
 */
export const BACK_PREVIEW_EVENT = 'alpha-back-preview';
export interface BackPreview {phase: 'start' | 'progress' | 'cancel'; progress: number; edge: 'left' | 'right'}

/** The farthest a previewed layer moves (px) and shrinks (fraction) at full progress. */
const SHIFT = 16, SHRINK = 0.08, SETTLE_MS = 150;

function openMenu(root: Document) {
  try { return !!root.querySelector('[popover]:popover-open:not([data-alpha-dialog-toast])'); } catch { return false; }
}
/** The layer the next Back closes, in the order agent-adapter's Back handler closes them. */
export function backPreviewTarget(root: Document = document): HTMLElement | null {
  if (openMenu(root)) return null;
  const dialog = Array.from(root.querySelectorAll<HTMLDialogElement>('dialog[open]')).at(-1);
  if (dialog) return dialog;
  return Array.from(root.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]:not([data-alpha-layer="drawer"])'))
    .filter(panel => !panel.closest('[inert],[hidden]') && panel.getAttribute('aria-hidden') !== 'true' && panel.getClientRects().length > 0 && getComputedStyle(panel).visibility !== 'hidden')
    .at(-1) ?? null;
}

export function installPredictiveBack(win: Window = window): () => void {
  const root = win.document;
  let target: HTMLElement | null = null, saved: {translate: string; scale: string; transition: string} | null = null, settle: number | undefined;
  const reduced = () => { try { return win.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
  const restore = (animate: boolean) => {
    if (!target || !saved) { target = null; saved = null; return; }
    const element = target, before = saved;
    target = null; saved = null;
    win.clearTimeout(settle);
    element.style.transition = animate && !reduced() ? `translate ${SETTLE_MS}ms ease-out, scale ${SETTLE_MS}ms ease-out` : before.transition;
    element.style.translate = before.translate; element.style.scale = before.scale;
    delete element.dataset.alphaBackPreview;
    if (animate) settle = win.setTimeout(() => { if (!element.dataset.alphaBackPreview) element.style.transition = before.transition; }, SETTLE_MS + 30);
  };
  const preview = (event: Event) => {
    const detail = (event as CustomEvent<BackPreview>).detail;
    if (!detail || typeof detail.progress !== 'number') return;
    if (detail.phase === 'cancel') { restore(true); return; }
    if (detail.phase === 'start') restore(false);
    if (target && !target.isConnected) restore(false);
    if (!target) {
      const next = reduced() ? null : backPreviewTarget(root);
      if (!next) return;
      win.clearTimeout(settle);
      target = next;
      saved = {translate: next.style.translate, scale: next.style.scale, transition: next.style.transition};
      next.style.transition = 'none';
      next.dataset.alphaBackPreview = '';
    }
    const progress = Math.max(0, Math.min(1, detail.progress));
    target.style.translate = `${(detail.edge === 'right' ? -1 : 1) * Math.round(progress * SHIFT * 10) / 10}px 0`;
    target.style.scale = String(Math.round((1 - progress * SHRINK) * 1000) / 1000);
  };
  // The committed Back closes the layer; capture runs before handlers that stop the event.
  const committed = () => restore(false);
  win.addEventListener(BACK_PREVIEW_EVENT, preview);
  win.addEventListener('alpha-back', committed, true);
  win.addEventListener('launcher-home', committed, true);
  return () => {
    restore(false);
    win.removeEventListener(BACK_PREVIEW_EVENT, preview);
    win.removeEventListener('alpha-back', committed, true);
    win.removeEventListener('launcher-home', committed, true);
  };
}
