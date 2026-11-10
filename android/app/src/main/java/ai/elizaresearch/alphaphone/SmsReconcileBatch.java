package ai.elizaresearch.alphaphone;

/**
 * At most one provider reconciliation waits at a time. A callback asks with {@link #request}; only
 * the first of a burst is told to queue one. The queued reconcile calls {@link #begin} as it starts,
 * so evidence recorded from then on queues the next one and is never missed. Plain Java: host-tested
 * by javac.
 */
final class SmsReconcileBatch {
 private boolean queued;
 /** True when the caller must queue a reconcile; false while one is already waiting to run. */
 synchronized boolean request() { if (queued) return false; queued = true; return true; }
 /** The waiting reconcile is starting (or could not be queued). */
 synchronized void begin() { queued = false; }
}
