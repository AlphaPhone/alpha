/** Composes several signals into one; falls back to listeners on WebView 113, which lacks `AbortSignal.any`. */
export { anyAbortSignal } from '../runtime/abort-signal';

/** A `DOMException` named `AbortError` with the given message. */
export const abortError = (message = 'Cancelled'): DOMException => new DOMException(message, 'AbortError');

/** True for a `DOMException` named `AbortError` (what `fetch`, the Web Share API and `abortError()` throw). */
export const isAbortError = (error: unknown): boolean => error instanceof DOMException && error.name === 'AbortError';

/** Resolves after `ms`; with a signal, throws `signal.reason` if already aborted and rejects with it on abort. */
export function delay(ms: number, signal?: AbortSignal): Promise<void> {
  if (!signal) return new Promise(resolve => setTimeout(resolve, ms));
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}

/** Settles with `work`, or rejects with `signal.reason ?? abortError()` as soon as the signal aborts. */
export function raceAbort<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  let cancel = () => {};
  const cancelled = new Promise<never>((_resolve, reject) => { cancel = () => reject(signal.reason ?? abortError()); });
  signal.addEventListener('abort', cancel, { once: true });
  if (signal.aborted) cancel();
  return Promise.race([work, cancelled]).finally(() => signal.removeEventListener('abort', cancel));
}
