/** Work the browser adapter's 100 ms poll may skip. Pure decisions and a small saver with injected
 * effects; nothing here touches the DOM or a native plugin directly. */

/** Off the Browser view with the native surface already hidden, there is no geometry to measure or send. */
export const surfacePollIdle = (view: unknown, lastGeometry: string, hiddenGeometry: string): boolean =>
  view !== 'browser' && lastGeometry === hiddenGeometry;

export const SAVE_RETRY_MIN_MS = 2000, SAVE_RETRY_MAX_MS = 60000;
/** Wait before repeating a save that failed `failures` times in a row: 2 s, doubling, at most 60 s. */
export function saveRetryDelay(failures: number): number {
  const steps = Math.max(0, Math.min(30, Math.floor(Number(failures) || 0) - 1));
  return Math.min(SAVE_RETRY_MAX_MS, SAVE_RETRY_MIN_MS * 2 ** steps);
}

export type SessionSaver = {
  /** Called on every poll. Builds a snapshot only when an input changed or a failed save is due again. */
  save(): void;
  /** Treat the current snapshot as already stored (after a restore or a clear). */
  prime(): void;
};

/**
 * Saves the browsing snapshot when it changes.
 * - `inputs` are compared by identity, so an unchanged poll costs no snapshot and no serialisation.
 * - One write is in flight at a time; a changed snapshot is written as soon as it is seen.
 * - A rejected write is not repeated on the next poll: the same snapshot is retried only after
 *   `saveRetryDelay`, which grows with consecutive failures and resets on success.
 * - While `enabled` is false nothing is built or written, and the pending change is kept for later.
 */
export function createSessionSaver<T>(input: {
  inputs: () => readonly unknown[];
  snapshot: () => T | null;
  write: (snapshot: T) => Promise<unknown>;
  enabled: () => boolean;
  now?: () => number;
}): SessionSaver {
  const now = input.now || (() => Date.now());
  let seen: readonly unknown[] | undefined, lastSaved = '', failed = false, failures = 0, retryAt = 0;
  let queue: Promise<unknown> = Promise.resolve();
  const changed = () => {
    const next = input.inputs();
    if (seen && seen.length === next.length && next.every((value, index) => value === seen![index])) return false;
    seen = next;
    return true;
  };
  return {
    save() {
      if (!input.enabled()) return;
      const due = failed && now() >= retryAt;
      if (!changed() && !due) return;
      const snapshot = input.snapshot();
      if (!snapshot) { seen = undefined; return; }
      const next = JSON.stringify(snapshot);
      if (next === lastSaved && !due) return;
      lastSaved = next; failed = false;
      queue = queue.then(() => input.enabled() ? input.write(snapshot) : undefined).then(
        () => { if (lastSaved === next) failures = 0; },
        () => { if (lastSaved !== next) return; failed = true; failures += 1; retryAt = now() + saveRetryDelay(failures); },
      );
    },
    prime() {
      seen = input.inputs();
      lastSaved = JSON.stringify(input.snapshot());
      failed = false; failures = 0;
    },
  };
}
