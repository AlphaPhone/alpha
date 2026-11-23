// spec/files/browser.md, "Only the newest access read decides access, and without access nothing is listed"; spec/files/storage.md, "Story: Never be told a folder is empty when Files could not know"
import { FolderOpen, RotateCcw } from "lucide-react";
import type { Access } from "../../../gen/files__storage.ts";
import { Alert, Button, EmptyState, Skeleton } from "../components/ui/index.ts";

/** What the access panel shows: the access the newest read decided, and how to ask for it again. */
export interface StorageAccessProps {
  /** The access the newest read decided. */
  access: Access;
  /** Android 10 grants storage access rather than all-files access. */
  legacy: boolean;
  /** A read is in flight, so Try again waits. */
  loading: boolean;
  /** The owner allows access. */
  onAllow: () => void;
  /** The owner asks Files to read the storage again. */
  onRetry: () => void;
}

/**
 * Why Files lists nothing in the place shown: access not yet read, refused with an Allow action, or storage unavailable with Try again.
 * @model spec/files/browser.md
 */
export function StorageAccess({ access, legacy, loading, onAllow, onRetry }: StorageAccessProps) {
  if (access === "AccessUnknown") {
    return <div role="status" aria-label="Loading" className="flex flex-col gap-2 p-4" aria-busy><Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" /></div>;
  }
  if (access === "AccessDenied") {
    return (
      <EmptyState role="alert" title="Files shows your files and folders after you allow access." icon={<FolderOpen className="size-10" />}>
        <Button onClick={onAllow}>{legacy ? "Allow storage access" : "Allow all files access"}</Button>
      </EmptyState>
    );
  }
  if (access === "AccessUnavailable") {
    return (
      <Alert role="alert" className="m-4 flex items-center justify-between gap-3">
        <span>This storage is unavailable.</span>
        <Button variant="outline" size="sm" onClick={onRetry} disabled={loading}><RotateCcw className="size-4" />Try again</Button>
      </Alert>
    );
  }
  return null;
}
