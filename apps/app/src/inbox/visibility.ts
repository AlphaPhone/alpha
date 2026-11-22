// spec/inbox/mailbox.md, "Read-ahead is one memory-only request, bounded, only while the Inbox is in front"; spec/inbox/failures.md, "A failure is classified by its cause, in a fixed order"

/** Whether the launcher's page is in front of the owner now. */
export function pageVisible(): boolean {
  return typeof document === "undefined" || !document.hidden;
}

/** Whether the WebView reports a network connection. */
export function pageOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}
