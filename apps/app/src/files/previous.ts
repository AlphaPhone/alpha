// spec/files/recent.md, "A phone updated from the previous Alpha keeps its Recent and the document it had open"
import type { RecentRow } from "../../gen/files__recent.ts";

/** Where the previous Alpha kept Recent, and the picked document showing when it last closed, in the WebView's own storage. */
const PREVIOUS_RECENT = "alpha.files.recent.v1";
const PREVIOUS_OPEN = "alpha.files.open.v1";
/** The previous Alpha read at most this many rows, as this version keeps at most this many. */
const PREVIOUS_LIMIT = 24;
const SELECTION = /^[A-Za-z0-9:_-]{1,100}$/;

/** The previous Alpha's Recent, newest first, and the selection it had open. */
export interface PreviousRecent {
  readonly rows: ReadonlyArray<RecentRow>;
  readonly wasOpen: string;
}

/** One row of the previous index, as this version names it; undefined for a row the previous Alpha did not read either. */
function rowOf(value: unknown): RecentRow | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const row = value as { key?: unknown; kind?: unknown; name?: unknown; mimeType?: unknown; openedAt?: unknown; status?: unknown; selectionId?: unknown };
  if (typeof row.key !== "string" || !row.key || row.key.length > 200 || (row.kind !== "selected" && row.kind !== "scan-pdf")) return undefined;
  if (typeof row.name !== "string" || !row.name || row.name.length > 255 || typeof row.mimeType !== "string" || row.mimeType.length > 200) return undefined;
  if (typeof row.openedAt !== "number" || !Number.isFinite(row.openedAt)) return undefined;
  if (row.status !== "ready" && row.status !== "revoked" && row.status !== "saved") return undefined;
  if (row.selectionId !== undefined && (typeof row.selectionId !== "string" || !SELECTION.test(row.selectionId))) return undefined;
  const selection = typeof row.selectionId === "string" ? row.selectionId : "";
  const picked = row.kind === "selected";
  return {
    key: picked && selection ? `picked:${selection}` : picked ? `picked:${row.name}` : `scan:${row.name}`,
    kind: picked ? "PickedDoc" : "ScanPdf", name: row.name, mimeType: row.mimeType, openedAt: Math.trunc(row.openedAt),
    status: row.status === "ready" ? "Ready" : row.status === "revoked" ? "Revoked" : "Saved", selection,
  };
}

/**
 * The previous Alpha's Recent as it showed it, newest first, and the selection it had open; undefined when it kept no
 * Recent or its Recent cannot be read. Rows it would not have read are left out, as it left them out.
 * @throws {never}
 */
export function previousRecent(): PreviousRecent | undefined {
  try {
    const raw = globalThis.localStorage?.getItem(PREVIOUS_RECENT) ?? null;
    if (raw === null) return undefined;
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return undefined;
    const rows = data.map(rowOf).filter((row): row is RecentRow => row !== undefined).slice(0, PREVIOUS_LIMIT)
      .sort((a, b) => b.openedAt - a.openedAt);
    const open = globalThis.localStorage?.getItem(PREVIOUS_OPEN) ?? "";
    return { rows, wasOpen: SELECTION.test(open) ? open : "" };
  } catch {
    return undefined;
  }
}

/** Removes the previous Alpha's Recent and its open document, once this version holds them. @throws {never} */
export function forgetPreviousRecent(): void {
  try {
    globalThis.localStorage?.removeItem(PREVIOUS_RECENT);
    globalThis.localStorage?.removeItem(PREVIOUS_OPEN);
  } catch {
    // The previous index stays and is taken by nothing: Recent is no longer empty.
  }
}
