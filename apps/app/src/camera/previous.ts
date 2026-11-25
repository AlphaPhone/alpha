// spec/app/photos/index.md, "A saved copy the earlier Alpha left pending is checked once instead of forgotten"
import { EditReceipt, type EditOperationId, type PhotosClient } from "@elizaos/os-bridges";
import { Schema } from "effect";
import { previousCopyCleared, type PendingOutcome } from "../../gen/app__photos.ts";

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
    // The record stays and is removed on a later start once the phone settles it.
  }
}

function editOperation(raw: string): EditOperationId | undefined {
  const decoded = Schema.decodeUnknownOption(EditReceipt)({ status: "unknown", operationId: raw });
  return decoded._tag === "Some" ? decoded.value.operationId : undefined;
}

let active: { readonly phone: PhotosClient; readonly token: string; readonly run: Promise<PendingOutcome> } | undefined;

/**
 * Checks the one saved-copy operation the earlier Alpha left pending on the phone, never saving again, and clears
 * `alpha.photos.pending-copy.v1` only once the phone settles it.
 */
export function checkPreviousPendingCopy(phone: PhotosClient): Promise<PendingOutcome> {
  const token = previousPendingCopy();
  if (token === undefined) return Promise.resolve("PendingUnknown");
  const operationId = editOperation(token);
  if (operationId === undefined) return Promise.resolve("PendingUnknown");
  if (active?.phone === phone && active.token === token) return active.run;
  const run = (async (): Promise<PendingOutcome> => {
    let outcome: PendingOutcome = "PendingUnknown";
    try {
      const reply = await phone.editResult(operationId);
      if (reply.status === "saved") outcome = "PendingSaved";
      else if (reply.status !== "unknown" && reply.status !== "incomplete") outcome = "PendingGone";
    } catch {
      outcome = "PendingUnknown";
    }
    if (previousCopyCleared(true, outcome)) forgetPreviousPendingCopy(token);
    return outcome;
  })().finally(() => {
    if (active?.phone === phone && active.token === token) active = undefined;
  });
  active = { phone, token, run };
  return run;
}
