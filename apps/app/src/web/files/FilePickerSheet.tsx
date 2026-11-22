// spec/files/picker.md, "Story: Choose a file from my phone for another app on Alpha"
import { ArrowUp, FolderOpen, Laptop } from "lucide-react";
import type { Picker } from "../../../gen/files__picker.ts";
import { Alert, Button, EmptyState, Sheet, SheetContent, Skeleton } from "../components/ui/index.ts";
import { FileRow } from "./FileRow.tsx";

const ERRORS: Readonly<Record<Picker["error"], string>> = {
  NoError: "", TooMany: "You can't attach more files here.", FileChanged: "This file changed. Select it again.",
  Unsupported: "Choose a supported photo or document.", ReadFailed: "The selection could not be read. Try again.", AccessNeeded: "Files access is needed first.",
};

export type FilePickerSheetProps = {
  picker: Picker;
  /** Choose from the system document picker, or from this computer in the browser. */
  deviceLabel: string;
  onBrowse: (path: string) => void;
  onReview: (key: string) => void;
  onUnchoose: (key: string) => void;
  onDevice: () => void;
  onAttach: () => void;
  onDismiss: () => void;
};

/**
 * The picker other areas open to have the owner choose real files; it attaches exactly what was chosen, as it is now.
 * @model spec/files/picker.md
 */
export function FilePickerSheet({ picker, deviceLabel, onBrowse, onReview, onUnchoose, onDevice, onAttach, onDismiss }: FilePickerSheetProps) {
  const busy = picker.reading !== "" || picker.attaching;
  const parent = picker.path.includes("/") ? picker.path.slice(0, picker.path.lastIndexOf("/")) : "";
  return (
    <Sheet open={picker.open} onOpenChange={(open) => !open && onDismiss()}>
      <SheetContent side="bottom" title="Choose files">
        <div className="flex items-center gap-2 px-3">
          <Button variant="ghost" size="icon" aria-label="Up" disabled={picker.path === "" || busy} onClick={() => onBrowse(parent)}><ArrowUp className="size-4" /></Button>
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{picker.path || "Internal storage"}</span>
          <Button variant="ghost" size="sm" disabled={busy} onClick={onDevice}><Laptop className="size-4" />{deviceLabel}</Button>
        </div>
        {picker.error !== "NoError" && <Alert role="alert" className="mx-3">{ERRORS[picker.error]}</Alert>}
        <div className="max-h-[50dvh] overflow-y-auto">
          {picker.loading && <div className="flex flex-col gap-2 p-3" aria-busy><Skeleton className="h-12" /><Skeleton className="h-12" /></div>}
          {!picker.loading && picker.listing === "Complete" && picker.rows.length === 0 && <EmptyState title="This folder is empty" icon={<FolderOpen className="size-8" />} />}
          {picker.listing === "Partial" && <p role="status" className="px-4 text-sm text-muted-foreground">This listing is incomplete.</p>}
          <ul aria-label="Files">
            {picker.rows.map((row) => {
              const chosen = picker.selected.some((p) => p.key === row.key);
              return (
                <li key={row.key}>
                  <FileRow row={row} selecting={row.kind !== "KindFolder"} selected={chosen} disabled={busy}
                    onOpen={() => (row.kind === "KindFolder" ? onBrowse(row.path) : chosen ? onUnchoose(row.key) : onReview(row.key))} />
                </li>
              );
            })}
            {picker.selected.filter((p) => p.token === "").map((p) => (
              <li key={p.key} className="px-4 py-2 text-sm">{p.name}</li>
            ))}
          </ul>
        </div>
        <div className="flex items-center justify-between gap-2 px-4 pb-4">
          <span className="text-sm tabular-nums" aria-live="polite">{picker.selected.length ? `${picker.selected.length} selected` : ""}</span>
          <Button onClick={onAttach} loading={picker.attaching} disabled={picker.selected.length === 0 || busy}>Attach</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
