// spec/notes/previousDevice.md, "Story: Read Notes kept by an earlier installation of Alpha"
import { useId } from "react";
import type { PreviousDeviceNotes as PreviousNotesData } from "../../notes/previous-device-notes.ts";
import { Button, Sheet, SheetContent } from "../components/ui/index.ts";

/** What an earlier installation kept, once read, and the sheet's two controls. */
export interface PreviousDeviceNotesViewProps {
  /** The saved notes and unsaved edits, or undefined while they are read. */
  data: PreviousNotesData | undefined;
  /** Read the earlier notes again. */
  onRetry: () => void;
  /** Close the sheet. */
  onClose: () => void;
}

function EarlierNotesSection({ title, source }: { title: string; source: PreviousNotesData["saved"] }) {
  return (
    <section className="space-y-3 px-5">
      <h3 className="font-medium">{title}</h3>
      {source.status === "empty" && <p className="text-sm text-muted-foreground">Nothing saved here.</p>}
      {source.status === "unavailable" && <p role="status" className="text-sm">Couldn’t read this data. It’s still kept on this phone.</p>}
      {source.status === "available" && source.pendingRemovals > 0 && <p className="text-sm">Pending deletions were kept in the earlier draft.</p>}
      {source.status === "available" && source.notes.map((note) => (
        <details key={note.id} className="rounded-md border border-border p-3">
          <summary className="cursor-pointer break-words">{note.title || "Untitled note"}</summary>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm">{note.body}</p>
          {note.details.map((line, index) => <p key={index} className="whitespace-pre-wrap break-words text-sm">{line}</p>)}
        </details>
      ))}
    </section>
  );
}

/** The earlier installation's saved notes and unsaved edits, read only. */
export function PreviousDeviceNotesView({ data, onRetry, onClose }: PreviousDeviceNotesViewProps) {
  const descriptionId = useId();
  const retry = data?.saved.status === "unavailable" || data?.draft.status === "unavailable";
  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="bottom" title="Previous notes" aria-describedby={descriptionId} className="max-h-[85dvh] space-y-4 overflow-y-auto">
        <p id={descriptionId} className="px-5 text-sm text-muted-foreground">Read text kept by an earlier version of Alpha on this phone.</p>
        {data === undefined ? <p className="px-5" role="status">Checking previous notes…</p> : (
          <>
            <EarlierNotesSection title="Saved notes" source={data.saved} />
            <EarlierNotesSection title="Unsaved edits" source={data.draft} />
          </>
        )}
        {retry && <Button className="mx-5" variant="secondary" onClick={onRetry}>Try again</Button>}
      </SheetContent>
    </Sheet>
  );
}
