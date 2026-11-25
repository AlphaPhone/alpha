// spec/app/assistant/attachments.md, "Story: Choose files to attach"; spec/app/assistant/attachments.md, "Cancel closes the picker, and files still being read are not attached"
import { Button, Dialog, DialogContent, DialogTitle, SearchField, cn } from "@repo/ui";
import { Check, File as FileIcon, Image, X } from "lucide-react";
import { useRef, useState } from "react";
import type { Tab } from "../../gen/app__assistant__attachments.ts";

export type SourceSelection = { id: string; name: string; bytes?: number; photo?: File; load: () => Promise<File | undefined> };

interface AttachmentSourcesProps {
  tab: Tab;
  room: number;
  accept: string;
  chooseDocument?: () => Promise<SourceSelection | undefined>;
  onAttach: (selected: readonly SourceSelection[]) => Promise<boolean>;
  onClose: () => void;
  onReturnFocus: () => void;
  onTab: (tab: Tab) => void;
}

const tabs = [["Photos", "Photos"], ["Documents", "Files"]] as const;

function sizeOf(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Review a choice from the platform's photo or document selector before adding it to the originating draft. */
export function AttachmentSources({ tab, room, accept, chooseDocument, onAttach, onClose, onReturnFocus, onTab }: AttachmentSourcesProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const [selected, select] = useState<readonly SourceSelection[]>([]);
  const [search, setSearch] = useState("");
  const [reading, setReading] = useState(false);
  const [problem, setProblem] = useState(false);
  const photos = tab === "Photos";
  const source = photos ? "photos" : "files";
  const fromComputer = chooseDocument === undefined;
  const matches = selected.filter(({ name }) => name.toLowerCase().includes(search.trim().toLowerCase()));
  const browse = () => {
    if (photos || chooseDocument === undefined) {
      inputRef.current?.click();
      return;
    }
    setReading(true);
    setProblem(false);
    void chooseDocument().then((file) => { if (file) select([file]); }).catch(() => setProblem(true)).finally(() => setReading(false));
  };
  const attach = () => {
    if (reading || selected.length === 0) return;
    setReading(true);
    setProblem(false);
    void onAttach(selected).then((accepted) => setProblem(!accepted), () => setProblem(true)).finally(() => setReading(false));
  };
  const switchTo = (shown: Tab) => {
    if (shown === tab || reading) return;
    select([]);
    setSearch("");
    setProblem(false);
    onTab(shown);
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        aria-label="Attach files"
        aria-describedby={undefined}
        aria-labelledby={undefined}
        overlayClassName="bg-black/28"
        style={{ top: "8dvh" }}
        className="inset-x-0 bottom-0 max-w-103 translate-y-0 gap-0 overflow-hidden rounded-t-sheet rounded-b-none bg-background p-0 text-foreground"
        onOpenAutoFocus={(event) => { event.preventDefault(); openerRef.current?.focus(); }}
        onCloseAutoFocus={(event) => { event.preventDefault(); onReturnFocus(); }}
      >
        <header className="flex shrink-0 items-center gap-2.5 px-4 py-3">
          <Button ref={openerRef} variant="ghost" size="icon" aria-label="Close attachments" onClick={onClose}><X /></Button>
          <DialogTitle className="flex-1 font-display text-title font-normal">Attach</DialogTitle>
          <Button aria-label="Attach selected files" size="icon" className="w-auto px-[1.125rem] text-base disabled:opacity-40" disabled={selected.length === 0 || selected.length > room || reading} onClick={attach}>Attach</Button>
        </header>
        <SearchField className="mx-5 mb-3 shrink-0" style={{ height: 46, minHeight: 46, borderRadius: 16 }} aria-label={`Search ${source}`} placeholder={`Search ${source}`} value={search} onValueChange={setSearch} />
        <nav className="mx-5 mb-3 flex shrink-0 gap-1 rounded-action bg-secondary p-[3px]" aria-label="Attachment sources">
          {tabs.map(([value, label]) => <Button key={value} variant="ghost" aria-pressed={value === tab} disabled={reading} onClick={() => switchTo(value)}
            className={cn("h-11 flex-1 rounded-action px-2 text-base", value === tab && "bg-foreground text-background hover:bg-foreground/90")}>{label}</Button>)}
        </nav>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4" aria-busy={reading || undefined}>
          <input ref={inputRef} type="file" aria-label={`Select ${source}`} accept={accept} multiple hidden onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []);
            event.currentTarget.value = "";
            if (files.length > 0) {
              setProblem(false);
              select(files.map((file) => ({ id: crypto.randomUUID(), name: file.name, bytes: file.size, photo: photos ? file : undefined, load: () => Promise.resolve(file) })));
            }
          }} />
          {problem && <p role="alert" className="py-3 text-sm text-destructive">Could not attach the selected files</p>}
          {selected.length > room && <p role="status" className="py-3 text-sm text-muted-foreground">{`Choose up to ${room} files.`}</p>}
          <div className={photos ? "grid grid-cols-3 gap-0.75" : undefined}>
            {matches.map((file) => (
              <button key={file.id} type="button" aria-label={`Remove ${file.name} from the selection`} aria-pressed="true" disabled={reading}
                className={cn("relative min-w-0 overflow-hidden text-left text-base", photos ? "aspect-square rounded-lg bg-secondary" : "flex min-h-19 w-full items-center gap-3.5 border-b py-3")}
                onClick={() => select(selected.filter((item) => file !== item))}>
                {photos && file.photo ? <img alt={file.name} className="size-full object-cover" ref={(node) => {
                  if (!node || file.photo === undefined) return;
                  const url = URL.createObjectURL(file.photo);
                  node.src = url;
                  return () => URL.revokeObjectURL(url);
                }} /> : photos ? <Image aria-hidden className="mx-auto size-6.5" /> : <FileIcon aria-hidden className="size-6.5 shrink-0" />}
                {!photos && <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate font-medium">{file.name}</span>
                  {file.bytes !== undefined && <span className="text-xs text-muted-foreground">{sizeOf(file.bytes)}</span>}
                </span>}
                <Check aria-hidden className={cn("size-6 shrink-0 rounded-full bg-alpha p-1 text-alpha-foreground", photos && "absolute top-2 right-2")} />
              </button>
            ))}
          </div>
        </div>
        <footer style={{ minHeight: 81 }} className="flex shrink-0 items-center gap-3 border-t px-5 pt-2 pb-[max(--spacing(3.5),calc(max(var(--alpha-native-inset-bottom,0px),env(safe-area-inset-bottom))_+_--spacing(2)))] text-meta">
          <span role="status" className="flex-1 text-muted-foreground">{selected.length > 0 ? `${selected.length} selected` : ""}</span>
          {selected.length > 0 && <Button variant="secondary" size="icon" className="w-auto px-3.5 text-sm" disabled={reading} onClick={() => select([])}>Clear</Button>}
          <Button variant="secondary" size="icon" className="w-auto px-3.5 text-sm" onClick={browse} disabled={reading}>
            {fromComputer ? "From computer" : `Choose ${source}`}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
