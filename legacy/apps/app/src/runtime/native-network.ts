export type NativeNetworkStatus = {connected?: boolean; wifiActive?: boolean; internetValidated?: boolean};

/** A local Android observation, never a Cloud reachability or billing request. Unknown native
 * state must not turn a stale WebView offline hint into a refusal of the owner's message. */
export function readNativeNetwork(read: () => Promise<unknown>, signal?: AbortSignal, timeoutMs = 1500): Promise<boolean | undefined> {
  return readNativeNetworkStatus(read, signal, timeoutMs).then(status => status?.connected);
}

export function readNativeNetworkStatus(read: () => Promise<unknown>, signal?: AbortSignal, timeoutMs = 1500): Promise<NativeNetworkStatus | undefined> {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (status?: NativeNetworkStatus, error?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      if (error !== undefined) reject(error); else resolve(status);
    };
    const abort = () => finish(undefined, signal?.reason ?? new DOMException('Network observation cancelled', 'AbortError'));
    const timer = setTimeout(() => finish(), timeoutMs);
    signal?.addEventListener('abort', abort, {once: true});
    if (signal?.aborted) { abort(); return; }
    Promise.resolve().then(read).then(value => {
      if (!value || typeof value !== 'object') { finish(); return; }
      const status: NativeNetworkStatus = {};
      for (const key of ['connected', 'wifiActive', 'internetValidated'] as const) {
        const fact = (value as Record<string, unknown>)[key];
        if (typeof fact === 'boolean') status[key] = fact;
      }
      finish(status);
    }, () => finish());
  });
}
