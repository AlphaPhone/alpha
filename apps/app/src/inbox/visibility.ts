// spec/inbox/mailbox.md, "Read-ahead is one memory-only request, bounded, only while the Inbox is in front"; spec/inbox/failures.md, "A failure is classified by its cause, in a fixed order"

export { pageVisible } from "../platform/build-flags.ts";

/** Whether the WebView reports a network connection. @throws {never} */
export function pageOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}
