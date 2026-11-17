/**
 * What the owner reads after a Notes document import or export, or a scan PDF export. The
 * document backends (Android's document picker and the browser's file input and downloads)
 * report a status code; Alpha words it here and never shows a backend's own text.
 *
 * Android's `AlphaNoteDocumentsPlugin` reports several distinct reasons under one status (a busy
 * picker, a locked or backgrounded note and an unusable provider result are all "unavailable").
 * Each of those reviewed native sentences is keyed below to an Alpha sentence that keeps the
 * step that fixes it; any other text falls back to the status sentence.
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

/** A reviewed native result: its status and its exact message. */
const native = (status: string, message: string) => `${status}\n${message}`;

const BUSY = native("unavailable", "A document operation is already open.");
const NO_DOCUMENT = native(
  "unavailable",
  "The document provider returned no accessible document.",
);
const CLOSED = native("cancelled", "Document operation closed.");
const NOT_WRITTEN = native(
  "failed",
  "The selected destination could not be written.",
);

const NATIVE_IMPORT: Readonly<Record<string, string>> = {
  [BUSY]: "Another document is already open. Finish it, then try again.",
  [NO_DOCUMENT]:
    "The chosen file could not be opened. Choose another file. Nothing imported.",
  [CLOSED]: "Document operation closed. Nothing imported.",
};

const NATIVE_EXPORT: Readonly<Record<string, string>> = {
  [BUSY]: "Another document is already open. Finish it, then try again.",
  [NO_DOCUMENT]:
    "The chosen location could not be opened. Choose another location. Nothing exported.",
  [CLOSED]: "Document operation closed. Nothing exported.",
  [NOT_WRITTEN]: "The chosen location could not be written. Nothing exported.",
};

const NATIVE_BY_OPERATION: Readonly<
  Record<NoteDocumentOperation, Readonly<Record<string, string>>>
> = {
  import: NATIVE_IMPORT,
  "export-text": {
    ...NATIVE_EXPORT,
    [native("unavailable", "Open and unlock the selected note before saving.")]:
      "Open and unlock the note, then save again.",
  },
  "export-pdf": {
    ...NATIVE_EXPORT,
    [native("failed", "PDF export requires valid PDF bytes of at most 8 MB.")]:
      "Export requires a valid PDF of at most 8 MB.",
  },
};

/**
 * Alpha's sentence for a document result. A reviewed native `message` picks its specific
 * sentence; otherwise the status decides, and an unknown status reads as a failure.
 */
export function noteDocumentText(
  operation: NoteDocumentOperation,
  status: unknown,
  message?: unknown,
): string {
  if (typeof status === "string" && typeof message === "string") {
    const specific = NATIVE_BY_OPERATION[operation];
    const key = native(status, message);
    if (Object.hasOwn(specific, key)) return specific[key];
  }
  const table = BY_OPERATION[operation];
  return typeof status === "string" && Object.hasOwn(table, status)
    ? table[status]
    : table.failed;
}
