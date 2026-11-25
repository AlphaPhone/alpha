import { ChevronRight, Trash2 } from "lucide-react";

export type PhotoTrashRowProps = {
  /** How many items wait in Recently deleted. */
  count: number;
  /** Opens Recently deleted; without it the row cannot be pressed. */
  onOpen?: () => void;
};

/** The row under the albums that opens Recently deleted, with how many items wait there. */
export function PhotoTrashRow({ count, onOpen }: PhotoTrashRowProps) {
  return (
    <button type="button" aria-label="Recently deleted" disabled={!onOpen} onClick={onOpen} className="mx-3 mt-6 flex h-14 w-[calc(100%-1.5rem)] items-center gap-3.5 rounded-drawer-icon px-3 text-left">
      <Trash2 aria-hidden className="size-5.5 shrink-0 text-muted-foreground" />
      <span className="flex-1 text-base leading-tight">Recently deleted</span>
      <span className="text-meta text-muted-foreground">{count}</span>
      <ChevronRight aria-hidden className="size-4.5 shrink-0 text-muted-foreground" />
    </button>
  );
}
