// spec/camera/copyIntent.md, "A request the previous Alpha left pending is admitted once, into an empty slot"

/** Where the previous Alpha kept, on the phone, the operation id of its one pending saved-copy request. */
const PREVIOUS_PENDING_COPY = "alpha.photos.pending-copy.v1";
const OPERATION_ID = /^[-\w]{1,200}$/;

/** The operation id the previous Alpha left pending, or undefined when it left none or what it left is not an operation id. @throws {never} */
export function previousPendingCopy(): string | undefined {
  try {
    const raw = globalThis.localStorage?.getItem(PREVIOUS_PENDING_COPY) ?? null;
    return raw !== null && OPERATION_ID.test(raw) ? raw : undefined;
  } catch {
    return undefined;
  }
}

/** Removes the previous Alpha's record of `token`, only while it still names that request. @throws {never} */
export function forgetPreviousPendingCopy(token: string): void {
  try {
    if (globalThis.localStorage?.getItem(PREVIOUS_PENDING_COPY) === token) globalThis.localStorage.removeItem(PREVIOUS_PENDING_COPY);
  } catch {
    // The record stays and is removed on a later start once the slot reads back with it.
  }
}
