// spec/files/browser.md, "Story: Open Files and see my storage"; spec/files/browser.md, "Browse shows each category's count and size, and how many items Trash holds"; spec/files/storage.md, "The primary volume is listed first, and its used share is a whole percentage of what is known"; spec/files/recent.md, "Story: Reopen what I opened recently"
import { Download, FileText, FolderOpen, HardDrive, Image, Music, RotateCcw, Trash2, Video, type LucideIcon } from "lucide-react";
import type { Browser } from "../../../gen/files__browser.ts";
import type { Recent, RecentRow } from "../../../gen/files__recent.ts";
import type { FileCategory, Volume } from "../../../gen/files__storage.ts";
import { showsBar, usedPercent } from "../../../gen/files__storage.ts";
import { Alert, Button, EmptyState, ListRow, Progress, Skeleton } from "../components/ui/index.ts";
import { CATEGORY_LABELS, formatSize } from "./format.ts";
import { kindIcon } from "./FileRow.tsx";
import { kindOf } from "../../files/paths.vibe";

const CATEGORY_ICONS: Readonly<Record<FileCategory, LucideIcon>> = { Downloads: Download, Images: Image, Videos: Video, Audio: Music, Documents: FileText };
const CATEGORIES: readonly FileCategory[] = ["Downloads", "Images", "Videos", "Audio", "Documents"];

export type BrowseViewProps = {
  browser: Browser;
  /** Recent documents, newest first. */
  recent: Recent;
  onCategory: (category: FileCategory) => void;
  onVolume: (volume: Volume) => void;
  onTrash: () => void;
  onAllow: () => void;
  onRetry: () => void;
  onRecent: (row: RecentRow) => void;
  /** Choose a document with the system picker; undefined where there is none. */
  onPick?: () => void;
};

/**
 * Browse: the categories with their counts, each volume with its free space, Trash, and Recent.
 * @model spec/files/browser.md
 */
export function BrowseView({ browser, recent, onCategory, onVolume, onTrash, onAllow, onRetry, onRecent, onPick }: BrowseViewProps) {
  if (browser.access === "AccessUnknown") {
    return <div className="flex flex-col gap-2 p-4" aria-busy>{CATEGORIES.map((c) => <Skeleton key={c} className="h-14" />)}</div>;
  }
  if (browser.access === "AccessDenied") {
    return (
      <EmptyState title="Files shows your files and folders after you allow access." icon={<FolderOpen className="size-10" />}>
        <Button onClick={onAllow}>{browser.legacyAccess ? "Allow storage access" : "Allow all files access"}</Button>
      </EmptyState>
    );
  }
  if (browser.access === "AccessUnavailable") {
    return (
      <Alert role="alert" className="m-4 flex items-center justify-between gap-3">
        <span>This storage is unavailable.</span>
        <Button variant="outline" size="sm" onClick={onRetry} disabled={browser.loading} aria-label="Try again"><RotateCcw className="size-4" /></Button>
      </Alert>
    );
  }
  const count = (category: FileCategory) => browser.counts.find((c) => c.category === category);
  return (
    <div className="flex flex-col pb-6">
      <ul aria-label="Categories">
        {CATEGORIES.map((category) => {
          const Icon = CATEGORY_ICONS[category];
          const counted = count(category);
          return (
            <li key={category}>
              <ListRow title={CATEGORY_LABELS[category]} leading={<Icon aria-hidden className="size-6 text-primary" />}
                detail={counted && counted.bytes >= 0 ? formatSize(counted.bytes) : undefined}
                trailing={counted ? String(counted.count) : undefined} onClick={() => onCategory(category)} />
            </li>
          );
        })}
      </ul>
      <ul aria-label="Storage" className="mt-2">
        {browser.volumes.map((volume) => (
          <li key={volume.id}>
            <ListRow title={volume.name} leading={<HardDrive aria-hidden className="size-6 text-muted-foreground" />}
              detail={showsBar(volume) ? `${formatSize(volume.free)} free of ${formatSize(volume.total)}` : undefined}
              onClick={() => onVolume(volume)}>
            </ListRow>
            {showsBar(volume) && <Progress className="mx-4 mb-2 h-1" value={usedPercent(volume)} aria-label={`${volume.name} used`} />}
          </li>
        ))}
        <li>
          <ListRow title="Trash" leading={<Trash2 aria-hidden className="size-6 text-muted-foreground" />}
            trailing={browser.trashCount > 0 ? String(browser.trashCount) : undefined} onClick={onTrash} />
        </li>
      </ul>
      {(recent.rows.length > 0 || onPick) && (
        <section aria-label="Recent" className="mt-4">
          <h2 className="px-4 pb-1 font-mono text-xs tracking-widest text-muted-foreground uppercase">Recent</h2>
          <ul>
            {recent.rows.map((row) => {
              const Icon = kindIcon(kindOf(row.mimeType, false));
              return (
                <li key={row.key}>
                  <ListRow title={row.name} leading={<Icon aria-hidden className="size-6 text-muted-foreground" />}
                    detail={row.status === "Revoked" ? "Select again" : row.status === "Saved" ? "Saved PDF" : undefined}
                    disabled={row.status !== "Ready"} onClick={() => onRecent(row)} />
                </li>
              );
            })}
          </ul>
          {onPick && <Button variant="ghost" className="mx-4 mt-1" onClick={onPick}>Choose a document</Button>}
        </section>
      )}
    </div>
  );
}
