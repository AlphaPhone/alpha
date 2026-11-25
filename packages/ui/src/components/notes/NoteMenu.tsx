import { useState, type Ref } from "react";
import { Ellipsis, Pin, Share2, Trash2 } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../Menu.tsx";

export interface NoteMenuProps {
  /** Whether the note is pinned, which makes the pin action Unpin. */
  pinned?: boolean;
  /** Shares the note; offered only with it. */
  onShare?: () => void;
  /** Pins the note, or unpins it; offered only with it. */
  onPin?: () => void;
  /** Moves the note to Recently deleted; offered only with it. */
  onDelete?: () => void;
  /** The size of the More button: 44px in the editor's busy header, whose menu reaches past Done to the screen's edge, 52px elsewhere. */
  size?: "sm" | "md";
  /** Returns focus to More after a destination panel closes. */
  triggerRef?: Ref<HTMLButtonElement>;
}

/** The actions of an open note, behind its More button: Share, Pin or Unpin, and Delete. */
export function NoteMenu({ pinned = false, onShare, onPin, onDelete, size = "md", triggerRef }: NoteMenuProps) {
  const [open, setOpen] = useState(false);
  const item = "min-h-12 rounded-option px-3 text-base";
  return (
    <Menu open={open} onOpenChange={setOpen}>
      <MenuTrigger ref={triggerRef} aria-label="More"
        onPointerDown={(event) => { if (event.button === 0 && !event.ctrlKey) event.preventDefault(); }}
        onClick={(event) => { if (event.button === 0 && !event.ctrlKey) setOpen((shown) => !shown); }}
        className={cn(focusRing, "flex shrink-0 items-center justify-center rounded-full active:bg-accent", size === "sm" ? "size-11" : "size-13")}>
        <Ellipsis aria-hidden className="size-5.5" />
      </MenuTrigger>
      <MenuContent aria-label="Note actions" aria-labelledby={undefined} sideOffset={size === "sm" ? 6 : 2} alignOffset={size === "sm" ? -58 : 2}
        className="min-w-52 rounded-lg border-0 bg-card p-1.5 shadow-lg">
        <MenuItem disabled={!onShare} onSelect={onShare} className={item}><Share2 aria-hidden className="size-4.5" />Share</MenuItem>
        <MenuItem disabled={!onPin} onSelect={onPin} className={item}><Pin aria-hidden className="size-4.5" />{pinned ? "Unpin" : "Pin"}</MenuItem>
        <div role="separator" className="my-1 border-t border-border" />
        <MenuItem disabled={!onDelete} onSelect={onDelete} className={item}><Trash2 aria-hidden className="size-4.5" />Delete</MenuItem>
      </MenuContent>
    </Menu>
  );
}
