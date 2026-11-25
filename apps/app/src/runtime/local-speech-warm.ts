/**
 * The background on-device speech warm-up (connection-ui's foreground warm). The native speech
 * bridge admits one request at a time and refuses the rest, so the owner's own speech requests
 * (Talk or Transcribe readiness, playback) wait for a warm-up in flight instead of being refused
 * by it. The wait is bounded: a slow warm-up never holds the owner's request for long.
 */
let warming: Promise<void> | undefined;
export const LOCAL_SPEECH_WARM_WAIT_MS = 10_000;
/** Runs `start` unless a warm-up is already in flight; it never rejects. */
export function runLocalSpeechWarm(start: () => Promise<unknown>): Promise<void> {
  if (warming) return warming;
  const run: Promise<void> = Promise.resolve().then(start).then(() => {}, () => {})
    .finally(() => { if (warming === run) warming = undefined; });
  warming = run;
  return run;
}
/** Resolves once no warm-up is in flight (or after the bound); rejects only on `signal`. */
export function afterLocalSpeechWarm(signal?: AbortSignal, limitMs = LOCAL_SPEECH_WARM_WAIT_MS): Promise<void> {
  const pending = warming;
  if (!pending) return Promise.resolve();
  if (signal?.aborted) return Promise.reject(signal.reason);
  return new Promise<void>((resolve, reject) => {
    const done = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); };
    const abort = () => { done(); reject(signal!.reason); };
    const timer = setTimeout(() => { done(); resolve(); }, limitMs);
    signal?.addEventListener('abort', abort, { once: true });
    void pending.then(() => { done(); resolve(); });
  });
}
