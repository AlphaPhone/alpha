// States the Files components reach, for their stories (`*.meta.tsx`).
import type { Browser } from "../../../gen/files__browser.ts";
import { initial as browserInitial } from "../../../gen/files__browser.ts";
import type { Filtering } from "../../../gen/files__filter.ts";
import { initial as filterInitial } from "../../../gen/files__filter.ts";
import type { PdfPages } from "../../../gen/files__pdf.ts";
import { initial as pagesInitial } from "../../../gen/files__pdf.ts";
import type { Picker } from "../../../gen/files__picker.ts";
import { initial as pickerInitial } from "../../../gen/files__picker.ts";
import type { PreviewState } from "../../../gen/files__preview.ts";
import { initial as previewInitial } from "../../../gen/files__preview.ts";
import type { SharePanel } from "../../../gen/files__share.ts";
import { initial as panelInitial } from "../../../gen/files__share.ts";
import type { Row } from "../../../gen/files__storage.ts";
import type { TrashView } from "../../../gen/files__trash.ts";
import { initial as trashInitial } from "../../../gen/files__trash.ts";

const day = 86_400_000;
const at = 1_763_000_000_000;

/** A PDF, a picture and a folder of the Download folder. */
export const rows: Row[] = [
  { key: "primary\nDownload/Receipts", path: "Download/Receipts", folder: "Download", name: "Receipts", kind: "KindFolder", mimeType: "", size: 0, modified: at - day, children: 4 },
  { key: "primary\nDownload/lease.pdf", path: "Download/lease.pdf", folder: "Download", name: "lease.pdf", kind: "KindPdf", mimeType: "application/pdf", size: 182_044, modified: at - 3_600_000, children: -1 },
  { key: "primary\nDownload/IMG_0001.jpg", path: "Download/IMG_0001.jpg", folder: "Download", name: "IMG_0001.jpg", kind: "KindImage", mimeType: "image/jpeg", size: 2_406_118, modified: at - 2 * day, children: -1 },
];

/** Browse with access, counts, two volumes and Trash. */
export const browse: Browser = {
  ...browserInitial, active: true, access: "AccessGranted", generation: 1, accessTicket: 1,
  volumes: [{ id: "primary", name: "Internal storage", primary: true, free: 41_000_000_000, total: 128_000_000_000 }, { id: "card", name: "SD card", primary: false, free: 0, total: 0 }],
  counts: [{ category: "Downloads", count: 3, bytes: 2_588_162 }, { category: "Images", count: 128, bytes: -1 }, { category: "Documents", count: 12, bytes: 4_210_000 }],
  trashCount: 2,
};

/** Browse before the owner allowed access. */
export const denied: Browser = { ...browserInitial, active: true, access: "AccessDenied" };

/** The Download folder, read completely. */
export const folder: Browser = { ...browse, place: { tag: "InFolder", path: "Download", volume: "" }, rows, listing: "Complete" };

/** The Download folder with two rows selected. */
export const selecting: Browser = { ...folder, selecting: true, selected: [rows[1]!.key, rows[2]!.key] };

/** Documents, read only in part: the newest rows of a larger category. */
export const partial: Browser = { ...browse, place: { tag: "InCategory", category: "Documents" }, rows: [rows[1]!], listing: "Partial", listedCount: 12 };

/** An empty folder, read completely. */
export const empty: Browser = { ...browse, place: { tag: "InFolder", path: "Music", volume: "" }, listing: "Complete" };

/** Trash with two items, one from the SD card. */
export const trash: TrashView = {
  ...trashInitial, active: true, ticket: 1, listing: "Complete",
  items: [
    { key: "primary\n1", id: "1", volume: "", name: "old.pdf", origin: "Download", directory: false, kind: "KindPdf", size: 10_200, deletedAt: at - 2 * day },
    { key: "card\n2", id: "2", volume: "card", name: "IMG_0100.jpg", origin: "DCIM/Camera", directory: false, kind: "KindImage", size: 3_100_000, deletedAt: at - 29 * day },
  ],
};

/** The agent's filter for PDFs, shown with one result. */
export const filtered: Filtering = {
  ...filterInitial, active: true, serial: 1, shown: 1, complete: true, generation: 1,
  criteria: { text: "lease", kind: "PdfKind", within: "", since: "", until: "" }, rows: [rows[1]!],
  ops: [{ id: 1, criteria: { text: "lease", kind: "PdfKind", within: "", since: "", until: "" }, phase: "FilterDone", ticket: 1, aborted: false, result: "FilterShown", count: 1 }],
};

/** A text file shown in the preview. */
export const previewText: PreviewState = {
  ...previewInitial, active: true, epoch: 1, shown: true, shownEpoch: 1, serial: 1, opened: 1, content: "ContentText",
  body: "Lease renewal: the term starts in March.",
  doc: { selection: "s1", path: "Download/notes.txt", volume: "", name: "notes.txt", mimeType: "text/plain", kind: "KindDocument", size: 40, modified: at, source: "Browsed" },
};

/** A PDF shown at its second page. */
export const previewPdf: PreviewState = { ...previewText, content: "ContentPdf", body: "", doc: { ...previewText.doc, path: "Download/lease.pdf", name: "lease.pdf", mimeType: "application/pdf", kind: "KindPdf", size: 182_044 } };
export const pdfPage: PdfPages = { ...pagesInitial, doc: 1, ticket: 2, page: 1, count: 3, shown: true, image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=", outcome: "PageRendered" };

/** The share panel for a picture, with Email and Messages. */
export const panel: SharePanel = { ...panelInitial, seen: 1, active: 1, emails: [1], messages: [1] };

/** The picker at the Download folder with one file chosen. */
export const picker: Picker = {
  ...pickerInitial, open: true, epoch: 1, ticket: 1, path: "Download", rows, listing: "Complete", maximum: 4, outcome: "Choosing",
  selected: [{ key: rows[1]!.key, name: rows[1]!.name, mimeType: rows[1]!.mimeType, size: rows[1]!.size, token: "A".repeat(43) }],
};
