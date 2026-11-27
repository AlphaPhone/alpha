// spec/app/assistant/attachments.md, "Story: Choose files to attach"; spec/app/assistant/attachments.md, "Cancel closes the picker, and files still being read are not attached"
import { Button, Dialog, DialogContent, DialogTitle, Input, SearchField, Skeleton, cn } from "@repo/ui";
import { Check, ChevronLeft, ChevronRight, File as FileIcon, Folder, Image, X } from "lucide-react";
import { memo, useCallback, useRef } from "react";
import type { Tab } from "../../gen/app__assistant__attachments.ts";

/** A source row already admitted by the picker for this view. */
export interface AttachmentSourceRow {
  readonly id: string;
  readonly name: string;
  readonly kind: "photo" | "file" | "folder";
  readonly thumbnail?: string;
  readonly thumbnailFile?: File;
  readonly bytes?: number;
  readonly selected: boolean;
  readonly onPress?: () => void;
}

export interface AttachmentSourcesProps {
  readonly tab: Tab;
  readonly room: number;
  readonly accept: string;
  readonly query: string;
  readonly rows: readonly AttachmentSourceRow[];
  readonly selected: number;
  readonly reading: boolean;
  readonly status: "Idle" | "Loading" | "Loaded" | "Failed";
  readonly problem?: string;
  readonly truncated?: boolean;
  readonly access?: { readonly label: string; readonly run: () => void };
  readonly location?: {
    readonly label: string;
    readonly onUp?: () => void;
    readonly volumes?: readonly { readonly id: string; readonly name: string; readonly selected?: boolean; readonly onPress?: () => void }[];
  };
  readonly onSearch?: (query: string) => void;
  readonly onRetry?: () => void;
  readonly onMore?: () => void;
  readonly onClear?: () => void;
  readonly onAttach?: () => void;
  readonly onClose: () => void;
  readonly onReturnFocus: () => void;
  readonly onTab?: (tab: Tab) => void;
  readonly onBrowse?: () => void;
  readonly onImport?: (files: readonly File[]) => void;
  readonly importLabel?: string;
}

const tabs = [["Photos", "Photos"], ["Documents", "Files"]] as const;
const placeholders = ["a", "b", "c", "d", "e", "f"] as const;

function sizeOf(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const PhotoThumb = memo(function PhotoThumb({ file }: { file: File }) {
  const bind = useCallback((node: HTMLImageElement | null) => {
    if (!node) return;
    const url = URL.createObjectURL(file);
    node.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return <img alt="" className="size-full object-cover" loading="lazy" ref={bind} />;
});

function SourceRow({ row, photos, reading }: { row: AttachmentSourceRow; photos: boolean; reading: boolean }) {
  const folder = row.kind === "folder";
  const icon = folder ? <Folder aria-hidden /> : <FileIcon aria-hidden />;
  return (
    <button type="button" aria-label={row.selected && !folder ? `Remove ${row.name} from the selection` : row.name}
      aria-pressed={folder ? undefined : row.selected} disabled={reading || row.onPress === undefined}
      className={cn("relative min-w-0 overflow-hidden text-left text-base disabled:opacity-60",
        photos ? "aspect-square rounded-frame bg-secondary" : "flex min-h-19 w-full items-center gap-3.5 border-b border-border py-3 [&>svg]:size-6.5 [&>svg]:shrink-0",
        photos && row.selected && "outline-2 -outline-offset-2 outline-alpha")}
      onClick={row.onPress}>
      {photos && row.thumbnailFile ? <PhotoThumb file={row.thumbnailFile} />
        : photos && row.thumbnail ? <img src={row.thumbnail} alt="" className="size-full object-cover" loading="lazy" />
        : photos ? <span aria-hidden className="flex h-full min-w-0 flex-col items-center justify-center gap-2 p-3 text-muted-foreground">
        <Image className="size-6.5 shrink-0" />
        <span className="max-w-full truncate text-2xs">{row.name}</span>
      </span> : icon}
      {!photos && <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate font-medium">{row.name}</span>
        {folder ? <span className="text-xs text-muted-foreground">Folder</span>
          : row.bytes !== undefined && <span className="text-xs text-muted-foreground">{sizeOf(row.bytes)}</span>}
      </span>}
      {folder ? <ChevronRight aria-hidden className="text-muted-foreground" />
        : photos ? <span aria-hidden className={cn("absolute top-2 right-2 grid size-6 place-items-center rounded-full border-[1.5px] bg-background",
          row.selected && "border-alpha bg-alpha text-alpha-foreground")}>{row.selected && <Check className="size-4" />}</span>
        : row.selected && <Check aria-hidden className="size-6 shrink-0 rounded-full bg-alpha p-1 text-alpha-foreground" />}
    </button>
  );
}

/** Shows the picker's current source, page, permission and reviewed selection. */
export function AttachmentSources({
  tab, room, accept, query, rows, selected, reading, status, problem, access, location, truncated,
  onSearch, onRetry, onMore, onClear, onAttach, onClose, onReturnFocus, onTab, onBrowse, onImport, importLabel = "From computer",
}: AttachmentSourcesProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const photos = tab === "Photos";
  const source = photos ? "photos" : "files";
  const loading = status === "Loading";
  const empty = status === "Loaded" && rows.length === 0 && !access && !problem;
  const failure = problem ?? (status === "Failed" ? `Could not load ${source}` : undefined);
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        aria-label="Attach files"
        data-alpha-own-gesture=""
        aria-describedby={undefined}
        overlayClassName="bg-black/28"
        style={{ top: "8dvh" }}
        className={cn("inset-x-0 bottom-0 max-h-none max-w-103 translate-y-0 gap-0 overflow-hidden rounded-t-sheet rounded-b-none border-t border-border bg-background p-0 text-foreground",
          "in-[body:has(main[data-alpha-native])]:max-w-none")}
        onOpenAutoFocus={(event) => { event.preventDefault(); openerRef.current?.focus(); }}
        onCloseAutoFocus={(event) => { event.preventDefault(); onReturnFocus(); }}
      >
        <header className="flex shrink-0 items-center gap-2.5 px-4 py-3">
          <Button ref={openerRef} variant="ghost" size="icon" aria-label="Close attachments" onClick={onClose}><X /></Button>
          <DialogTitle className="flex-1 font-display text-title font-normal">Attach</DialogTitle>
          <Button aria-label="Attach selected files" size="icon" className="w-auto px-[1.125rem] text-base disabled:opacity-50"
            disabled={!onAttach || selected === 0 || selected > room || reading || loading} onClick={onAttach}>Attach</Button>
        </header>
        <SearchField className="mx-5 mb-3 shrink-0" style={{ height: 46, minHeight: 46, borderRadius: 16 }} aria-label={`Search ${source}`}
          placeholder={`Search ${source}`} value={query} disabled={reading || !onSearch} onValueChange={onSearch ?? (() => {})} />
        <nav className="mx-5 mb-3 flex shrink-0 gap-1 rounded-action bg-secondary p-1" aria-label="Attachment sources">
          {tabs.map(([value, label]) => <Button key={value} variant="ghost" aria-pressed={value === tab} disabled={reading || !onTab} onClick={() => { if (value !== tab) onTab?.(value); }}
            className={cn("h-10.5 flex-1 rounded-list-icon px-2 text-base", value === tab && "bg-foreground text-background hover:bg-foreground/90")}>{label}</Button>)}
        </nav>
        {location && <div className="mx-5 mb-3 flex shrink-0 flex-wrap items-center gap-2" aria-label="File location">
          {location.onUp && <Button variant="ghost" size="icon" aria-label="Parent folder" disabled={reading} onClick={location.onUp}><ChevronLeft /></Button>}
          {location.label && <span className="min-w-0 truncate font-semibold">{location.label}</span>}
          {location.volumes?.map((volume) => <Button key={volume.id} variant={volume.selected ? "secondary" : "ghost"} size="sm"
            aria-pressed={volume.selected} disabled={reading || !volume.onPress} onClick={volume.onPress}>{volume.name}</Button>)}
        </div>}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4" aria-busy={reading || loading || undefined}>
          {onImport && <Input ref={inputRef} type="file" aria-label={`Select ${source}`} accept={accept} multiple hidden onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []);
            event.currentTarget.value = "";
            if (files.length > 0) onImport(files);
          }} />}
          {access && <div className="my-3 flex justify-center"><Button variant="secondary" disabled={reading} onClick={access.run}>{access.label}</Button></div>}
          {failure && <div className="my-3 flex flex-wrap items-center gap-2">
            <p role="alert" className="text-sm text-destructive">{failure}</p>
            {onRetry && <Button variant="ghost" disabled={reading} onClick={onRetry}>Try again</Button>}
          </div>}
          {selected > room && <p role="status" className="py-3 text-sm text-muted-foreground">{`Choose up to ${room} files.`}</p>}
          {loading && rows.length === 0 && <div role="status" aria-label={`Loading ${source}`} className={photos ? "-mx-2 grid grid-cols-3 gap-0.75" : "grid gap-2"}>
            {placeholders.map((key) => <Skeleton key={key} className={photos ? "aspect-square rounded-frame" : "h-13 rounded-action"} />)}
          </div>}
          {empty && <p role="status" className="pt-8 text-center text-sm text-muted-foreground">
            {query.trim() ? "No matching files" : photos ? "No photos yet" : "This folder is empty"}
          </p>}
          {rows.length > 0 && <div className={photos ? "-mx-2 grid grid-cols-3 gap-0.75" : undefined}>
            {rows.map((row) => <SourceRow key={row.id} row={row} photos={photos} reading={reading || loading} />)}
          </div>}
          {truncated && <p role="status" className="my-3 text-sm text-muted-foreground">Only some files are shown.</p>}
          {onMore && <Button variant="ghost" className="mx-auto my-3 flex" disabled={reading || loading} onClick={onMore}>{photos ? "More photos" : "More files"}</Button>}
        </div>
        <footer style={{ minHeight: 81 }} className="flex shrink-0 items-center gap-3 border-t border-border px-5 pt-2 pb-[max(--spacing(3.5),calc(var(--alpha-safe-bottom)+--spacing(2)))] text-meta">
          <span role="status" className="flex-1 text-muted-foreground">{selected > 0 ? `${selected} selected` : ""}</span>
          {selected > 0 && onClear && <Button variant="secondary" size="icon" className="w-auto px-3.5 text-sm font-medium" disabled={reading} onClick={onClear}>Clear</Button>}
          {onBrowse && <Button variant="secondary" size="icon" className="w-auto px-3.5 text-sm" disabled={reading} onClick={onBrowse}>{`Choose ${source}`}</Button>}
          {onImport && <Button variant="secondary" size="icon" className="w-auto px-3.5 text-sm" disabled={reading} onClick={() => inputRef.current?.click()}>{importLabel}</Button>}
        </footer>
      </DialogContent>
    </Dialog>
  );
}
