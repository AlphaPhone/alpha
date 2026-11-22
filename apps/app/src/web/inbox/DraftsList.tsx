// spec/inbox/drafts.md, "Back sets the draft aside, leaving keeps it open, and Drafts reopens it"; spec/inbox/drafts.md, "Deleting drafts removes exactly the versions the owner selected"; spec/inbox/mailbox.md, "Story: Keep my Gmail drafts beside my local drafts"
import { CheckSquare, FileText, Mail, Square } from "lucide-react";
import { useState } from "react";
import type { AccountDrafts, Draft, DraftPick } from "../../../gen/inbox__drafts.ts";
import type { DraftRow } from "../../../gen/inbox__mailbox.ts";
import { Button, Dialog, DialogContent, DialogTitle, EmptyState, ListRow } from "../components/ui/index.ts";

export type DraftsListProps = {
  /** The selected account's open draft and shelf. */
  drafts: AccountDrafts;
  /** Gmail drafts of the account, when it can list them. */
  gmailDrafts: DraftRow[];
  /** Whether the account lists only local drafts. */
  localOnly: boolean;
  onOpenLocal: (id: string, confirmed: boolean) => void;
  onOpenGmail: (row: DraftRow) => void;
  onDelete: (picks: DraftPick[]) => void;
};

const snippet = (d: Draft) => d.fields.body.replace(/\s+/g, " ").slice(0, 160);

/** Drafts: local drafts set aside on this phone beside the account's Gmail drafts, opened or deleted from here. */
export function DraftsList({ drafts, gmailDrafts, localOnly, onOpenLocal, onOpenGmail, onDelete }: DraftsListProps) {
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<DraftPick[]>([]);
  const [earlier, setEarlier] = useState<Draft | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isPicked = (d: Draft) => picked.some((p) => p.id === d.id);
  const toggle = (d: Draft) => setPicked(isPicked(d) ? picked.filter((p) => p.id !== d.id) : [...picked, { id: d.id, revision: d.revision }]);
  return (
    <div className="flex flex-col">
      {drafts.shelf.length > 0 && (
        <div className="flex items-center justify-end gap-1 px-2 py-1">
          {selecting ? (
            <>
              <Button size="sm" variant="destructive" disabled={picked.length === 0} onClick={() => setConfirmDelete(true)}>Delete drafts</Button>
              <Button size="sm" variant="ghost" onClick={() => { setSelecting(false); setPicked([]); }}>Done</Button>
            </>
          ) : <Button size="sm" variant="ghost" onClick={() => setSelecting(true)}>Select drafts</Button>}
        </div>
      )}
      <ul aria-label="Drafts on this phone" className="flex flex-col">
        {drafts.shelf.map((d) => (
          <li key={d.id}>
            <ListRow
              selected={isPicked(d)}
              leading={selecting ? (isPicked(d) ? <CheckSquare aria-hidden /> : <Square aria-hidden />) : <FileText aria-hidden />}
              title={d.fields.subject || "(No subject)"}
              detail={d.earlier ? "Earlier version of a sent email" : snippet(d)}
              onClick={() => (selecting ? toggle(d) : d.earlier ? setEarlier(d) : onOpenLocal(d.id, false))}
            />
          </li>
        ))}
      </ul>
      {!localOnly && (
        <ul aria-label="Gmail drafts" className="flex flex-col">
          {gmailDrafts.map((row) => (
            <li key={row.draftId}>
              <ListRow leading={<Mail aria-hidden />} title={row.subject || "(No subject)"} detail={row.recipients.join(", ") || row.snippet} onClick={() => onOpenGmail(row)} />
            </li>
          ))}
        </ul>
      )}
      {drafts.shelf.length === 0 && (localOnly || gmailDrafts.length === 0) && <EmptyState title="No drafts" />}
      <Dialog open={earlier !== undefined} onOpenChange={(open) => { if (!open) setEarlier(undefined); }}>
        <DialogContent>
          <DialogTitle>Open an earlier sent version?</DialogTitle>
          <p>This is an earlier version of a sent email. Sending it creates another message.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEarlier(undefined)}>Cancel</Button>
            <Button onClick={() => { if (earlier) onOpenLocal(earlier.id, true); setEarlier(undefined); }}>Open draft</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogTitle>{`Delete ${picked.length} draft${picked.length === 1 ? "" : "s"}?`}</DialogTitle>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { onDelete(picked); setPicked([]); setSelecting(false); setConfirmDelete(false); }}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
