import { ListGroup } from "../ListGroup.tsx";
import { Sheet, SheetContent } from "../Sheet.tsx";
import { InboxDraftRow, type InboxDraftRowProps } from "./InboxDraftRow.tsx";

export type InboxShelfSheetProps = {
  /** Whether the sheet is up; the parent keeps it. */
  open: boolean;
  /** Called when the sheet is dismissed. */
  onOpenChange: (open: boolean) => void;
  /** The drafts set aside in this cloud session, each exactly as it was left. */
  drafts: (Omit<InboxDraftRowProps, "onResume"> & { id: string })[];
  /** Brings a draft back, closing the sheet; offered only while no draft is open. */
  onResume?: (id: string) => void;
};

/**
 * The drafts set aside, from the foot of the screen: one is brought back as it was, and none is shown to someone who
 * signs in after.
 *
 * @model spec/app/inbox/shelf.md
 */
export function InboxShelfSheet({ open, onOpenChange, drafts, onResume }: InboxShelfSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title="Set aside">
        <ListGroup surface="plain">
          {drafts.map(({ id, ...draft }) => <InboxDraftRow key={id} {...draft} onResume={onResume && (() => { onResume(id); onOpenChange(false); })} />)}
        </ListGroup>
      </SheetContent>
    </Sheet>
  );
}
