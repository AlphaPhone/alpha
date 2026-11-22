// spec/files/mutations.md, "A confirmed chunk adds its receipts; a refused one stops; an unknown one claims nothing and stops"; spec/files/storage.md, "An item's days left count down from 30 and never go below zero"
import type { Batch } from "../../../gen/files__mutations.ts";
import type { FileCategory, FileKind } from "../../../gen/files__storage.ts";

/** Each Browse category's name. */
export const CATEGORY_LABELS: Readonly<Record<FileCategory, string>> = {
  Downloads: "Downloads", Images: "Images", Videos: "Videos", Audio: "Audio", Documents: "Documents",
};

/** "1 item" or "3 items". */
export const countLabel = (n: number) => (n === 1 ? "1 item" : `${n} items`);

/** A byte count as the owner reads it; empty when unknown. */
export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 100 ? Math.round(value) : Math.round(value * 10) / 10} ${units[unit]}`;
}

/** A listing date: the time today, month and day this year, the full date before. */
export function shortDate(time: number, now = Date.now()): string {
  if (!Number.isFinite(time) || time <= 0) return "";
  const date = new Date(time);
  const today = new Date(now);
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return date.toLocaleDateString(undefined, date.getFullYear() === today.getFullYear() ? { month: "short", day: "numeric" } : { year: "numeric", month: "short", day: "numeric" });
}

/** The date and time in a file's details. */
export function fullDate(time: number): string {
  if (!Number.isFinite(time) || time <= 0) return "";
  return new Date(time).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** The kind of file an owner recognises, never a raw MIME type. */
export function typeLabel(mimeType: string, kind: FileKind): string {
  if (kind === "KindFolder") return "Folder";
  if (kind === "KindPdf") return "PDF";
  if (kind === "KindImage") return "Image";
  if (kind === "KindAudio") return "Audio";
  if (kind === "KindVideo") return "Video";
  if (mimeType.startsWith("text/")) return "Text";
  if (/sheet|excel|csv/.test(mimeType)) return "Spreadsheet";
  if (/presentation|powerpoint/.test(mimeType)) return "Presentation";
  if (/word|document|opendocument\.text|rtf/.test(mimeType)) return "Document";
  if (/zip|tar|compressed|archive/.test(mimeType)) return "Archive";
  return "File";
}

const STORAGE_RESULTS: Readonly<Record<string, string>> = {
  "confirmation-required": "Confirm before deleting permanently.",
  invalid: "That name or location is not allowed.",
  missing: "This item is no longer there. Refresh and try again.",
  exists: "That name is already used here.",
  changed: "A selected item changed. Refresh and select it again.",
  unsupported: "Files cannot do that here.",
  unavailable: "This storage is unavailable.",
  denied: "Files access is needed first.",
  superseded: "Files started something newer. Nothing was changed.",
  cancelled: "Nothing was changed.",
  failed: "The operation could not be confirmed.",
  busy: "Files is still finishing the last change.",
};

const SHARE_RESULTS: Readonly<Record<string, string>> = {
  unsupported: "This selection cannot be shared here.",
  cancelled: "Sharing was cancelled.",
  failed: "Sharing could not open.",
  folders: "Select files without folders to share.",
  missing: "This item is no longer available.",
  limit: "Select up to 100 files to share.",
};

/** Alpha's sentence for each reviewed sentence the device answers; the device's own text is never shown. */
export const STORAGE_OUTCOMES: ReadonlyMap<string, string> = new Map([
  ["Invalid name or path.", "That name or location is not allowed."],
  ["That name is already used here.", "That name is already used here."],
  ["This item is no longer there.", "This item is no longer there. Refresh and try again."],
  ["This storage is not mounted.", "This storage is not mounted."],
  ["Files closed.", "Files closed before this finished. Try again."],
  ["Allow storage access to browse files.", "Allow storage access to browse files."],
  ["Allow all-files access to browse storage.", "Allow all files access to browse storage."],
  ["Open Files to review these items.", "Open Files to review these items."],
  ["A file couldn’t be verified. Nothing changed.", "A file couldn’t be verified. Nothing changed."],
  ["This file changed. Select it again.", "This file changed. Select it again."],
  ["Select files without folders to share.", "Select files without folders to share."],
  ["No app can open this file.", "No app can open this file."],
  ["Sharing is unavailable in this browser.", "Sharing is unavailable in this browser."],
]);

/** Alpha's sentence for a storage result that did not succeed; sharing reads as nothing shared rather than nothing changed. */
export function storageResultText(status: string, message: string | undefined, fallback: string, share = false): string {
  const known = message ? STORAGE_OUTCOMES.get(message.trim()) : undefined;
  if (known) return known;
  const limit = /^Select up to (\d{1,6}) files to share\.$/.exec(message?.trim() ?? "");
  if (limit) return `Select up to ${Number(limit[1])} files to share.`;
  if (share && Object.hasOwn(SHARE_RESULTS, status)) return SHARE_RESULTS[status]!;
  return Object.hasOwn(STORAGE_RESULTS, status) ? STORAGE_RESULTS[status]! : fallback;
}

/** What a selected document's text read said, when it showed no text. */
export function previewText(status: string): string {
  switch (status) {
    case "too-large": return "Text preview is limited to 64 KiB. Open this document in a compatible app.";
    case "unsupported": return "This file type has no text preview. Open it in a compatible app.";
    case "unavailable": return "Select this document again before reading it.";
    case "failed": return "This document could not be read.";
    default: return "No preview";
  }
}

/** What a PDF page outcome says. */
export function pageText(outcome: string): string {
  switch (outcome) {
    case "PageNotPdf": return "This file is not a PDF.";
    case "PageTimedOut": return "PDF preview took too long. Try again.";
    case "PageEncrypted": return "This PDF is encrypted or access to it expired. Open it in a compatible app or select it again.";
    case "PageMalformed": return "PDF preview is unavailable. The file may be damaged, encrypted, or larger than 20 MiB.";
    default: return "PDF preview is unavailable here. Open it in Android to view it.";
  }
}

const VERBS: Readonly<Record<Batch["op"], string>> = { CopyFiles: "Copied", MoveFiles: "Moved", TrashFiles: "Moved to Trash", RestoreFiles: "Restored", EraseFiles: "Deleted" };

/** The one sentence a settled batch reports: how many of how many, kept-both renames, and what could not be confirmed. */
export function batchSummary(b: Batch): string {
  if (b.phase === "NoBatch" || b.phase === "Running") return "";
  if (b.op === "TrashFiles" && b.done === 0) return b.phase === "Uncertain" ? "The operation could not be confirmed." : "Nothing was moved to Trash.";
  if (b.done === 0 && b.phase === "Uncertain") return "The operation could not be confirmed.";
  const verb = VERBS[b.op];
  const head = b.op === "TrashFiles"
    ? b.done === b.total ? `${countLabel(b.done)} moved to Trash` : `${b.done} of ${b.total} moved to Trash`
    : b.done === b.total ? `${verb} ${countLabel(b.done)}${b.renamed ? ` · ${b.renamed} renamed` : ""}` : `${verb} ${b.done} of ${b.total}`;
  return b.phase === "Uncertain" ? `${head}. Remaining results could not be confirmed.` : head;
}

/** The location of a file: its volume, then its folders. */
export function locationLabel(volume: string, folder: string): string {
  return [volume, ...folder.split("/").filter(Boolean)].join(" › ");
}
