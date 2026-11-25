import { X } from "lucide-react";
import { Button } from "../Button.tsx";
import { Sheet, SheetClose, SheetContent, type SheetProps } from "../Sheet.tsx";
import { AssistantSearch, type AssistantSearchProps } from "./AssistantSearch.tsx";

export type AssistantSearchSheetProps = Pick<SheetProps, "open" | "onOpenChange"> & {
  /** What the sheet shows. */
  search: AssistantSearchProps;
  /** Restores focus to the chat actions that opened Search. */
  onReturnFocus?: () => void;
};

/**
 * Search across every conversation in a sheet over Ask Alpha; closing it leaves its asking behind.
 * @model spec/app/assistant/search.md
 */
export function AssistantSearchSheet({ open, onOpenChange, search, onReturnFocus }: AssistantSearchSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        title="Search chats"
        data-alpha-own-gesture=""
        onCloseAutoFocus={onReturnFocus && ((event) => { event.preventDefault(); onReturnFocus(); })}
        aria-describedby={undefined}
        overlayClassName="bg-transparent dark:bg-transparent"
        className="inset-0 max-h-none max-w-md gap-4 bg-background p-5 text-foreground shadow-none before:hidden [&>div:first-child]:min-h-11 [&>div:first-child]:items-center [&>div:first-child]:pr-11 [&_h2]:pt-0 [&_h2]:font-sans [&_h2]:text-panel-title [&_h2]:font-bold"
      >
        <AssistantSearch {...search} />
        <SheetClose asChild>
          <Button variant="ghost" size="icon" aria-label="Close search" className="absolute top-5 right-5"><X aria-hidden /></Button>
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}
