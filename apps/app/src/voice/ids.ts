// spec/voice/latency.md, "A trial starts for a new turn before its reply is synthesized, and every started turn is recorded once"

/**
 * A fresh random id for a native request, a capture or a trial.
 * @throws {never}
 */
export function newId(): string {
  return globalThis.crypto.randomUUID();
}

/**
 * Whether the page reports the network as offline.
 * @throws {never}
 */
export function reportsOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/**
 * The listener bridge's in-memory key for a signed-in session: a SHA-256 digest of the opaque authority, never a credential.
 * @throws {never}
 */
export async function sessionKey(authority: string): Promise<string> {
  const bytes = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(authority));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
