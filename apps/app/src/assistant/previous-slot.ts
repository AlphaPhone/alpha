// spec/assistant/draft.md, "A draft the previous Alpha kept for the open conversation is taken once, and never sent"

/** The previous Alpha bounded a draft's text in UTF-8 bytes. */
const PREVIOUS_TEXT_BYTES = 64_000;
const ROW_KEYS = "binding,revision,text,version";
const SENDING_ROW_KEYS = "binding,revision,sending,text,version";

/** What the previous Alpha kept for one binding: the text, and whether it was being sent. */
export interface PreviousDraft {
  readonly text: string;
  readonly sending: boolean;
}

/** The encrypted slot the previous Alpha kept `binding`'s draft in: `assistant-draft:v1:` and the binding's lowercase hex SHA-256. */
export async function previousDraftSlot(binding: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(binding)));
  return "assistant-draft:v1:" + Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * The draft a previous slot holds for `binding`, read as the previous Alpha read it: exactly a version-1 row for this
 * binding, with `sending` only ever true; undefined for anything else, so another binding's text is never taken.
 * @throws {never}
 */
export function decodePreviousDraft(raw: string, binding: string): PreviousDraft | undefined {
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
    const row = value as Record<string, unknown>;
    const keys = Object.keys(row).sort().join(",");
    if (keys !== ROW_KEYS && (keys !== SENDING_ROW_KEYS || row.sending !== true)) return undefined;
    if (row.version !== 1 || row.binding !== binding || typeof row.revision !== "string" || !row.revision) return undefined;
    if (typeof row.text !== "string" || new TextEncoder().encode(row.text).length > PREVIOUS_TEXT_BYTES) return undefined;
    return { text: row.text, sending: row.sending === true };
  } catch {
    return undefined;
  }
}
