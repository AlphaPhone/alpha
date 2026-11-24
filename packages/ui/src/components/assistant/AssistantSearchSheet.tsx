import { Sheet, SheetContent, type SheetProps } from "../Sheet.tsx";
import { AssistantSearch, type AssistantSearchProps } from "./AssistantSearch.tsx";

export type AssistantSearchSheetProps = Pick<SheetProps, "open" | "onOpenChange"> & {
  /** What the sheet shows. */
  search: AssistantSearchProps;
};

/**
 * Search across every conversation in a sheet over Ask Alpha; closing it leaves its asking behind.
 * @model spec/app/assistant/search.md
 */
export function AssistantSearchSheet({ open, onOpenChange, search }: AssistantSearchSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title="Search chats" aria-describedby={undefined} className="min-h-[60dvh]">
        <AssistantSearch {...search} />
      </SheetContent>
    </Sheet>
  );
}
