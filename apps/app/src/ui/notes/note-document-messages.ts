/**
 * What the owner reads after a Notes document import or export, or a scan PDF export. The
 * document backends (Android's document picker and the browser's file input and downloads)
 * report a status code; Alpha words it here and never shows a backend's own text.
 */

/** Which document operation a status belongs to. */
export type NoteDocumentOperation = "import" | "export-text" | "export-pdf";

const IMPORT: Readonly<Record<string, string>> = {
  read: "Local text selected.",
  cancelled: "No file imported.",
  "too-large": "Choose a text file smaller than 2 MB.",
  failed: "Choose a valid UTF-8 text file. Nothing imported.",
  unsupported: "Notes import is unavailable.",
  unavailable: "Choosing a document is unavailable right now. Nothing imported.",
};

const EXPORT: Readonly<Record<string, string>> = {
  exported: "Saved.",
  unverified: "Save not confirmed. Check the file before trying again.",
  cancelled: "Nothing exported.",
  unavailable: "Saving a document is unavailable right now. Nothing exported.",
};

const EXPORT_TEXT: Readonly<Record<string, string>> = {
  ...EXPORT,
  requested: "Download requested. Check your browser downloads.",
  "too-large": "Export requires valid UTF-8 text of at most 64 KiB.",
  failed: "The note could not be exported.",
};

const EXPORT_PDF: Readonly<Record<string, string>> = {
  ...EXPORT,
  requested: "PDF download requested. Check your browser downloads.",
  "too-large": "The PDF is too large to export.",
  failed: "The PDF could not be exported.",
};

const BY_OPERATION: Readonly<
  Record<NoteDocumentOperation, Readonly<Record<string, string>>>
> = { import: IMPORT, "export-text": EXPORT_TEXT, "export-pdf": EXPORT_PDF };

/** Alpha's sentence for a document result status; an unknown status reads as a failure. */
export function noteDocumentText(
  operation: NoteDocumentOperation,
  status: unknown,
): string {
  const table = BY_OPERATION[operation];
  return typeof status === "string" && Object.hasOwn(table, status)
    ? table[status]
    : table.failed;
}
