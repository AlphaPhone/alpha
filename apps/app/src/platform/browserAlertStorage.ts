import { browserDocumentTransaction } from "./browserDocuments.ts";

const browserAlertsKey = "alpha.browser.notifications.v2";
const browserDocumentsChannel = "alpha.browser.documents.v1";

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function preference(record: unknown): Record<string, unknown> {
  if (record === undefined) return {};
  if (!object(record) || typeof record.revision !== "string" || (record.raw !== null && typeof record.raw !== "string")) {
    throw new Error("Browser alert preferences are unreadable");
  }
  if (record.raw === null) return {};
  const stored: unknown = JSON.parse(record.raw);
  if (!object(stored) || (stored.appEnabled !== undefined && typeof stored.appEnabled !== "boolean")) {
    throw new Error("Browser alert preferences are unreadable");
  }
  return stored;
}

/** Keep the same document as the earlier browser so visits in either version see the saved choice. */
export function browserAlertsEnabled(): Promise<boolean> {
  return browserDocumentTransaction("readonly", [browserAlertsKey], (_store, [record]) => preference(record).appEnabled !== false);
}

/** The transaction keeps the other notification policy fields from the record it updates. */
export async function saveBrowserAlerts(enabled: boolean): Promise<void> {
  const saved = await browserDocumentTransaction("readwrite", [browserAlertsKey], (store, [record]) => {
    const current = preference(record);
    if ((current.appEnabled !== false) === enabled) return false;
    store.put({ revision: crypto.randomUUID(), raw: JSON.stringify({ ...current, appEnabled: enabled }) }, browserAlertsKey);
    return true;
  });
  if (saved && typeof BroadcastChannel !== "undefined") {
    try {
      const channel = new BroadcastChannel(browserDocumentsChannel);
      try { channel.postMessage({ key: browserAlertsKey }); }
      finally { channel.close(); }
    } catch {
      void 0;
    }
  }
}

/** A different tab changed the document, or this tab came back into focus. */
export function listenBrowserAlerts(refresh: () => void): () => void {
  if (typeof window !== "undefined") window.addEventListener("focus", refresh);
  let channel: BroadcastChannel | undefined;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(browserDocumentsChannel);
      channel.addEventListener("message", (event: MessageEvent<unknown>) => {
        if (object(event.data) && event.data.key === browserAlertsKey) refresh();
      });
    }
  } catch {
    void 0;
  }
  return () => {
    if (typeof window !== "undefined") window.removeEventListener("focus", refresh);
    channel?.close();
  };
}
