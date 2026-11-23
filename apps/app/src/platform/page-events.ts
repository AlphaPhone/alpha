// spec/platform/lifecycle.md, "Leaving the app pauses it, and one return is counted once"; spec/platform/lifecycle.md, "A disposed watcher's queued callbacks change nothing"

/** What the page reports of the app going to the background and coming back. */
export interface PageWatch {
  readonly paused: () => void;
  /** A return, at a monotonic time in milliseconds. */
  readonly returned: (at: number) => void;
}

/**
 * Watches visibility and focus until the returned call disposes it; a callback the browser queued before
 * disposal is dropped. Times are the monotonic clock's, so a wall-clock jump never hides a return.
 * @throws {never}
 */
export function watchPage(watch: PageWatch): () => void {
  if (typeof document === "undefined" || typeof window === "undefined") return () => undefined;
  let live = true;
  const check = () => {
    if (!live) return;
    if (document.visibilityState === "hidden") watch.paused();
    else watch.returned(performance.now());
  };
  document.addEventListener("visibilitychange", check);
  window.addEventListener("focus", check);
  return () => {
    live = false;
    document.removeEventListener("visibilitychange", check);
    window.removeEventListener("focus", check);
  };
}
