// spec/files/browser.md, "Story: Open Files and see my storage"; spec/files/browser.md, "Browse shows each category's count and size, and how many items Trash holds"; spec/files/storage.md, "The primary volume is listed first, and its used share is a whole percentage of what is known"
import { Download, FileText, Folder, HardDrive, Image, Music, Trash2, Video, type LucideIcon } from "lucide-react";
import type { Browser } from "../../../gen/files__browser.ts";
import type { FileCategory, Volume } from "../../../gen/files__storage.ts";
import { showsBar, usedPercent } from "../../../gen/files__storage.ts";
import { ListRow, Progress } from "../components/ui/index.ts";
import { CATEGORY_LABELS, formatSize } from "./format.ts";
import { StorageAccess } from "./StorageAccess.tsx";

const CATEGORY_ICONS: Readonly<Record<FileCategory, LucideIcon>> = { Downloads: Download, Images: Image, Videos: Video, Audio: Music, Documents: FileText };
const CATEGORIES: readonly FileCategory[] = ["Downloads", "Images", "Videos", "Audio", "Documents"];

/** What Browse shows: the browser's access, counts, volumes and Trash, and where each row leads. */
export interface BrowseViewProps {
  /** The browser on Browse. */
  browser: Browser;
  /** The owner opens the whole primary storage at its root. */
  onAllFiles: () => void;
  /** The owner opens a category. */
  onCategory: (category: FileCategory) => void;
  /** The owner opens a volume at its root. */
  onVolume: (volume: Volume) => void;
  /** The owner opens Trash. */
  onTrash: () => void;
  /** The owner allows storage access. */
  onAllow: () => void;
  /** The owner asks Files to read the storage again. */
  onRetry: () => void;
}

/**
 * Browse: All files, the categories with their counts, each volume with its free space, and Trash; no search box and no Recents, since the agent filters.
 * @model spec/files/browser.md
 */
export function BrowseView({ browser, onAllFiles, onCategory, onVolume, onTrash, onAllow, onRetry }: BrowseViewProps) {
  if (browser.access !== "AccessGranted") {
    return <StorageAccess access={browser.access} legacy={browser.legacyAccess} loading={browser.loading} onAllow={onAllow} onRetry={onRetry} />;
  }
  const count = (category: FileCategory) => browser.counts.find((c) => c.category === category);
  return (
    <div className="flex flex-col pb-6">
      <ul aria-label="Categories">
        <li>
          <ListRow title="All files" aria-label="All files" leading={<Folder aria-hidden className="size-6 text-primary" />} onClick={onAllFiles} />
        </li>
        {CATEGORIES.map((category) => {
          const Icon = CATEGORY_ICONS[category];
          const counted = count(category);
          return (
            <li key={category}>
              <ListRow title={CATEGORY_LABELS[category]} aria-label={CATEGORY_LABELS[category]} leading={<Icon aria-hidden className="size-6 text-primary" />}
                detail={counted && counted.bytes >= 0 ? formatSize(counted.bytes) : undefined}
                trailing={counted ? String(counted.count) : undefined} onClick={() => onCategory(category)} />
            </li>
          );
        })}
      </ul>
      <h2 className="mt-4 px-4 pb-1 font-mono text-xs tracking-widest text-muted-foreground uppercase">Storage</h2>
      <ul aria-label="Storage">
        {browser.volumes.map((volume) => (
          <li key={volume.id}>
            <ListRow title={volume.name} aria-label={volume.name} leading={<HardDrive aria-hidden className="size-6 text-muted-foreground" />}
              detail={showsBar(volume) ? `${formatSize(volume.free)} free of ${formatSize(volume.total)}` : undefined}
              onClick={() => onVolume(volume)} />
            {showsBar(volume) && <Progress className="mx-4 mb-2 h-1" value={usedPercent(volume)} aria-label={`${volume.name} used`} />}
          </li>
        ))}
        <li>
          <ListRow title="Trash" aria-label="Trash" leading={<Trash2 aria-hidden className="size-6 text-muted-foreground" />}
            trailing={browser.trashCount > 0 ? String(browser.trashCount) : undefined} onClick={onTrash} />
        </li>
      </ul>
    </div>
  );
}
