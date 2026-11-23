// spec/settings/preferences.md, "A phone updated from the previous Alpha keeps the choices it saved there"; spec/settings/appearance.md, "A phone updated from the previous Alpha keeps the theme it chose there"

/** Where the previous Alpha kept its browser documents, and the document that held its device choices. */
const PREVIOUS_DOCUMENTS = "alpha.browser.documents.v1";
const PREVIOUS_RECORDS = "documents";
const PREVIOUS_DEVICE = "alpha.browser.device.v1";
/** Where the previous Alpha kept its theme. */
const PREVIOUS_APPEARANCE = "alpha.appearance.v1";

/**
 * The device choices the previous Alpha saved, as its JSON value: undefined when it saved none, null when its
 * record is there but cannot be read. The previous database is opened read-only and never created.
 */
export async function previousDeviceChoices(): Promise<string | null | undefined> {
  if (typeof indexedDB === "undefined") return undefined;
  const database = await new Promise<IDBDatabase | undefined | null>((resolve) => {
    let request: IDBOpenDBRequest;
    try { request = indexedDB.open(PREVIOUS_DOCUMENTS); } catch { resolve(null); return; }
    // A database that does not exist yet is never created here.
    request.onupgradeneeded = () => { request.transaction?.abort(); };
    request.onsuccess = () => { resolve(request.result); };
    request.onerror = () => { resolve(request.error?.name === "AbortError" ? undefined : null); };
    request.onblocked = () => { resolve(null); };
  });
  if (database === undefined || database === null) return database;
  try {
    if (!database.objectStoreNames.contains(PREVIOUS_RECORDS)) return undefined;
    const record = await new Promise<unknown>((resolve, reject) => {
      const request = database.transaction(PREVIOUS_RECORDS, "readonly").objectStore(PREVIOUS_RECORDS).get(PREVIOUS_DEVICE);
      request.onsuccess = () => { resolve(request.result); };
      request.onerror = () => { reject(request.error ?? new Error("unreadable")); };
    });
    if (record === undefined) return undefined;
    const raw = typeof record === "object" && record !== null ? (record as { raw?: unknown }).raw : undefined;
    // A reset tombstone holds no choices.
    if (raw === null) return undefined;
    if (typeof raw !== "string") return null;
    const envelope = JSON.parse(raw) as unknown;
    if (typeof envelope !== "object" || envelope === null || (envelope as { version?: unknown }).version !== 1) return null;
    const value = (envelope as { value?: unknown }).value;
    if (value === null) return undefined;
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  } finally {
    database.close();
  }
}

/** The theme the previous Alpha kept: "dark", "system", "light", or undefined when it kept none or none can be read. @throws {never} */
export function previousTheme(): string | undefined {
  try { return globalThis.localStorage?.getItem(PREVIOUS_APPEARANCE) ?? undefined; } catch { return undefined; }
}
