// spec/platform/index.md, "Story: Reach the phone's native capabilities"

/**
 * A fresh random UUID v4: a native request, stream, subscription or capture, a submission or mutation, or an idempotency key.
 * @throws {never}
 */
export function newId(): string {
  return globalThis.crypto.randomUUID();
}
