import { Sheet, SheetContent } from "../Sheet.tsx";
import { InboxAccountList, type InboxAccountListProps } from "./InboxAccountList.tsx";

export type InboxAccountSheetProps = Omit<InboxAccountListProps, "surface"> & {
  /** Whether the sheet is up; the parent keeps it. */
  open: boolean;
  /** Called when the sheet is dismissed, or when choosing an account closes it. */
  onOpenChange: (open: boolean) => void;
};

/**
 * Chooses among the connected Gmail accounts, from the foot of the screen.
 *
 * @model spec/app/inbox/index.md
 */
export function InboxAccountSheet({ open, onOpenChange, accounts, selected, onChoose }: InboxAccountSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title="Account">
        <InboxAccountList accounts={accounts} selected={selected} onChoose={onChoose && ((id) => { onChoose(id); onOpenChange(false); })} />
      </SheetContent>
    </Sheet>
  );
}
