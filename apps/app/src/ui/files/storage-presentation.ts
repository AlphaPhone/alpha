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
 * Alpha's sentence for a storage result that did not succeed, keyed on its status code; a
 * backend's own `message` is never shown. `fallback` is used for a status Alpha has no words for.
 */
export function storageResultText(
  status: unknown,
  fallback: string,
  operation?: "share",
): string {
  const key = typeof status === "string" ? status : "";
  if (operation === "share" && Object.hasOwn(SHARE_RESULTS, key))
    return SHARE_RESULTS[key];
  return Object.hasOwn(STORAGE_RESULTS, key) ? STORAGE_RESULTS[key] : fallback;
}
