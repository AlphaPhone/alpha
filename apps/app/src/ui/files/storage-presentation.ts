/**
 * What the Files browser shows for storage: category and sort labels, the folder path
 * breadcrumbs, sizes, free space and the agent filter's label. The storage rules they read (entry,
 * volume and filter shapes, path names) stay in the shared plugin-files storage model.
 */
import {
  baseName,
  type FilesCategory,
  type FilesFilter,
  type SortMode,
  type StorageVolume,
} from "@elizaos/plugin-files/browser/storage-model";

export const CATEGORIES: readonly { id: FilesCategory; label: string }[] = [
  { id: "downloads", label: "Downloads" },
  { id: "images", label: "Images" },
  { id: "videos", label: "Videos" },
  { id: "audio", label: "Audio" },
  { id: "documents", label: "Documents" },
];

export const SORT_LABELS: Record<SortMode, string> = {
  name: "Name",
  date: "Date",
  size: "Size",
};

export function breadcrumbs(
  path: string,
  rootLabel = "Internal storage",
): { label: string; path: string }[] {
  const parts = path ? path.split("/") : [];
  return [
    { label: rootLabel, path: "" },
    ...parts.map((label, index) => ({
      label,
      path: parts.slice(0, index + 1).join("/"),
    })),
  ];
}

export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return bytes + " B";
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024,
    unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return (
    (value >= 100 ? Math.round(value) : Math.round(value * 10) / 10) +
    " " +
    units[unit]
  );
}
/** A listing date: the time for today, month and day this year, the full date before that. */
export function shortDate(time: number): string {
  if (!Number.isFinite(time) || time <= 0) return "";
  const date = new Date(time),
    now = new Date();
  return date.toDateString() === now.toDateString()
    ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString(
        undefined,
        date.getFullYear() === now.getFullYear()
          ? { month: "short", day: "numeric" }
          : { year: "numeric", month: "short", day: "numeric" },
      );
}
/** The date and time in a file's details. */
export function fullDate(time: number): string {
  if (!Number.isFinite(time) || time <= 0) return "";
  return new Date(time).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
/** The kind of file an owner recognises, never a raw MIME type. */
export function typeLabel(mimeType: string, directory = false): string {
  if (directory) return "Folder";
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("audio/")) return "Audio";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType.startsWith("text/")) return "Text";
  // Office types all say "officedocument": test the specific kinds first.
  if (/sheet|excel|csv/.test(mimeType)) return "Spreadsheet";
  if (/presentation|powerpoint/.test(mimeType)) return "Presentation";
  if (/word|document|opendocument\.text|rtf/.test(mimeType)) return "Document";
  if (/zip|tar|compressed|archive/.test(mimeType)) return "Archive";
  return "File";
}
export function formatFree(
  volume: Pick<StorageVolume, "free" | "total" | "usage">,
): string {
  if (volume.total > 0)
    return `${formatSize(volume.free)} free of ${formatSize(volume.total)}`;
  const usage = volume.usage;
  if (!usage) return "";
  return `${formatSize(usage.bytes)} in ${usage.files} app ${usage.files === 1 ? "file" : "files"}`;
}

export function filterLabel(filter: FilesFilter): string {
  const kind = filter.kind
    ? {
        image: "Images",
        video: "Videos",
        audio: "Audio",
        document: "Documents",
        pdf: "PDFs",
        folder: "Folders",
      }[filter.kind]
    : "";
  const parts = [
    filter.text ? `“${filter.text}”` : "",
    kind,
    filter.folder
      ? "in " + (baseName(filter.folder) || "Internal storage")
      : "",
    filter.from || filter.to
      ? [filter.from?.slice(0, 10), filter.to?.slice(0, 10)]
          .filter(Boolean)
          .join(" – ")
      : "",
  ];
  return parts.filter(Boolean).join(" · ");
}

/** What the owner reads for a storage result status, whichever backend (Android or browser) answered. */
const STORAGE_RESULTS: Readonly<Record<string, string>> = {
  "confirmation-required": "Confirm before deleting permanently.",
  invalid: "That name or location is not allowed.",
  missing: "This item is no longer there. Refresh and try again.",
  exists: "That name is already used here.",
  changed: "A selected item changed. Refresh and select it again.",
  unsupported: "Files cannot do that here.",
  unavailable: "This storage is unavailable.",
  denied: "Files access is needed first.",
  cancelled: "Nothing was changed.",
  failed: "The operation could not be confirmed.",
};

/** Sharing statuses read differently: nothing was shared, rather than changed. */
const SHARE_RESULTS: Readonly<Record<string, string>> = {
  unsupported: "This selection cannot be shared here.",
  cancelled: "Sharing was cancelled.",
  failed: "Sharing could not open.",
};

/**
 * The outcomes a status does not identify on its own (one `unsupported` is the share limit,
 * another a folder in the selection or no app for the file), keyed by the sentence the backend
 * returns for it, with Alpha's wording. The keys are the reviewed sentences of Alpha's Android
 * plugin (`AlphaFilesPlugin.java`), the staged plugin-files browser volume (`storage-volume.ts`)
 * and Alpha's browser library (`apps/app/src/browser/files.ts`); the key is never shown itself.
 */
export const STORAGE_OUTCOMES: ReadonlyMap<string, string> = new Map([
  // Both backends
  ["Invalid name or path.", "That name or location is not allowed."],
  ["That name is already used here.", "That name is already used here."],
  ["This item is no longer there.", "This item is no longer there. Refresh and try again."],
  ["This storage is not mounted.", "This storage is not mounted."],
  ["The operation could not be confirmed.", "The operation could not be confirmed."],
  ["Confirm before deleting permanently.", "Confirm before deleting permanently."],
  // Android (AlphaFilesPlugin.java)
  ["Files closed.", "Files closed before this finished. Try again."],
  ["Allow storage access to browse files.", "Allow storage access to browse files."],
  ["Allow all-files access to browse storage.", "Allow all files access to browse storage."],
  ["Android's app settings are unavailable.", "Android’s app settings are unavailable."],
  ["Android's file access settings are unavailable.", "Android’s file access settings are unavailable."],
  ["Open Files to review these items.", "Open Files to review these items."],
  ["Choose one file to review.", "Choose one file to review."],
  ["A file couldn’t be verified. Nothing changed.", "A file couldn’t be verified. Nothing changed."],
  ["This file changed. Select it again.", "This file changed. Select it again."],
  ["Choose a supported photo or document.", "Choose a supported photo or document."],
  ["Choose a file up to 20 MiB.", "Choose a file up to 20 MiB."],
  ["Select files without folders to share.", "Select files without folders to share."],
  ["Sharing could not open.", "Sharing could not open."],
  ["No app can open this file.", "No app can open this file."],
  // Browser (storage-volume.ts, apps/app/src/browser/files.ts)
  ["A selected item changed. Refresh and select again.", "A selected item changed. Refresh and select it again."],
  ["Select files to share.", "Select files to share."],
  ["Sharing is unavailable in this browser.", "Sharing is unavailable in this browser."],
  ["Unsupported file operation.", "Files cannot do that here."],
  ["Nothing selected", "Nothing is selected."],
]);

/** Android's share limit (`MAX_SHARE_FILES`); the count is kept as data. */
const SHARE_LIMIT = /^Select up to (\d{1,6}) files to share\.$/;

/**
 * Alpha's sentence for a storage result that did not succeed. A reviewed backend sentence picks
 * its specific outcome from `STORAGE_OUTCOMES`; otherwise the status code is worded (sharing in
 * its own terms), and `fallback` is used for a status Alpha has no words for. A backend's own
 * text is never shown.
 */
export function storageResultText(
  result: { status?: unknown; message?: unknown },
  fallback: string,
  operation?: "share",
): string {
  const message =
    typeof result.message === "string" ? result.message.trim() : "";
  const known = STORAGE_OUTCOMES.get(message);
  if (known) return known;
  const limit = SHARE_LIMIT.exec(message);
  if (limit) return `Select up to ${Number(limit[1])} files to share.`;
  const key = typeof result.status === "string" ? result.status : "";
  if (operation === "share" && Object.hasOwn(SHARE_RESULTS, key))
    return SHARE_RESULTS[key];
  return Object.hasOwn(STORAGE_RESULTS, key) ? STORAGE_RESULTS[key] : fallback;
}

/** The text preview of a selected document, by the status its reader returned. */
const PREVIEW_RESULTS: Readonly<Record<string, string>> = {
  read: "Loaded",
  // The browser library previews up to 2 MB of text.
  large: "Open or download this file to read it.",
  binary: "Open or download this file.",
  "too-large":
    "Text preview is limited to 64 KiB. Open this document in a compatible app.",
  unsupported:
    "This file type has no text preview. Open it in a compatible app.",
  unavailable: "Select this document again before reading it.",
  failed: "This document could not be read.",
};

/**
 * Android's reader (the shared `SelectedDocuments.read`) answers several outcomes under one
 * status; its reviewed sentence picks the outcome, with Alpha's wording.
 */
export const PREVIEW_OUTCOMES: ReadonlyMap<string, string> = new Map([
  ["Select this document again before reading it.", "Select this document again before reading it."],
  ["The document provider could not open this selection.", "The app that stores this document could not open it."],
  ["Access expired. Select this document again.", "Access expired. Select this document again."],
  ["This file type has no text preview. Open it in a compatible app.", "This file type has no text preview. Open it in a compatible app."],
  ["This document does not contain supported UTF-8 text.", "This document does not contain supported UTF-8 text."],
  ["Text preview requires UTF-8. Open this document in a compatible app.", "Text preview requires UTF-8. Open this document in a compatible app."],
  ["Text preview is limited to 64 KiB. Open this document in a compatible app.", "Text preview is limited to 64 KiB. Open this document in a compatible app."],
  ["The document provider could not read this selection.", "The app that stores this document could not read it."],
]);

/**
 * What a selected document's preview says after its text was read: Alpha's sentence for the
 * reader's status, or for the reviewed sentence that identifies the outcome. The reader's own
 * text is never shown.
 */
export function selectedPreviewText(result: {
  status?: unknown;
  message?: unknown;
}): string {
  const message =
    typeof result.message === "string" ? result.message.trim() : "";
  const known = PREVIEW_OUTCOMES.get(message);
  if (known) return known;
  const key = typeof result.status === "string" ? result.status : "";
  return Object.hasOwn(PREVIEW_RESULTS, key) ? PREVIEW_RESULTS[key] : "No preview";
}
