import { FileText } from "lucide-react";
import { Button } from "../Button.tsx";
import { Sheet, SheetClose, SheetContent } from "../Sheet.tsx";

export type InboxFileOfferSheetProps = {
  /** Whether the sheet is up; the parent keeps it. */
  open: boolean;
  /** The file's name. */
  name: string;
  /** Its size, already worded. */
  size: string;
  /** Where in Alpha it was handed over from. */
  source: "Files" | "Photos";
  /** Whether it joins the draft open, or starts a new message with it from the account given. */
  into: "draft" | "new";
  /** Attaches it, or starts the message; it joins only where it fits the account's room, and the owner is told when it does not. */
  onTakeIn: () => void;
  /** Leaves it out. */
  onLeaveOut: () => void;
};

/**
 * A file another part of Alpha hands to the email, shown before it joins anything.
 *
 * @model spec/app/inbox/adding.md
 */
export function InboxFileOfferSheet({ open, name, size, source, into, onTakeIn, onLeaveOut }: InboxFileOfferSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onLeaveOut(); }}>
      <SheetContent
        title={into === "draft" ? "Attach to your draft?" : "Start a new email with this file?"}
        description={`From ${source}`}
        actions={
          <>
            <SheetClose asChild><Button variant="secondary">Leave out</Button></SheetClose>
            <Button onClick={onTakeIn}>{into === "draft" ? "Attach" : "New email"}</Button>
          </>
        }
      >
        <div className="flex items-center gap-3">
          <FileText aria-hidden className="size-6 shrink-0 text-muted-foreground" />
          <div className="min-w-0"><p className="text-base font-medium break-words">{name}</p><p className="text-sm text-muted-foreground">{size}</p></div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
