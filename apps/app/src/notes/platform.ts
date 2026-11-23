// spec/notes/share.md, "A share acts on the open note's snapshot, only while it is still the same note"; spec/notes/recorder.md, "A recording starts only for the current owner, after any playback has confirmed it stopped"; spec/notes/recordingOpen.md, "A read starts only while Notes can be shown and none is in flight, and opens Notes at most once per tap"

/** A fresh random UUID for a draft token, a creation identity or a folder. */
export function randomId(): string {
  return crypto.randomUUID();
}

/** The lowercase hex SHA-256 of a UTF-8 string, for owner digests and content revisions. */
export async function sha256Hex(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** The UTF-8 size of a string and whether it round-trips as text. */
export function utf8Size(text: string): { readonly bytes: number; readonly valid: boolean } {
  const encoded = new TextEncoder().encode(text);
  return { bytes: encoded.byteLength, valid: new TextDecoder("utf-8", { fatal: true }).decode(encoded) === text };
}

/** Copy text through the WebView clipboard. */
export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

/** Offer text to the system share sheet; "unavailable" where the WebView has none. */
export async function shareText(title: string, text: string): Promise<"shared" | "cancelled" | "unavailable"> {
  if (typeof navigator.share !== "function") return "unavailable";
  try {
    await navigator.share({ title, text });
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    throw error;
  }
}

/** Whether the page is in front, as the recorder and receipts check before acting. */
export function pageVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState !== "hidden";
}

/** Whether a page is there to post window events, which it is not in a unit test's runtime. */
export function pageAvailable(): boolean {
  return typeof window !== "undefined";
}
