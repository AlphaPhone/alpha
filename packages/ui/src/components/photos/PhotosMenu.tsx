import type { LucideIcon } from "lucide-react";
import { Ellipsis } from "lucide-react";
import { useState } from "react";

export type PhotosMenuAction = {
  /** What the action does, as the menu shows it. */
  label: string;
  /** Its mark, before the words. */
  icon: LucideIcon;
  /** What it is read out as, where it differs from the label. */
  description?: string;
  onSelect: () => void;
};

export type PhotosMenuProps = {
  /** What the ⋯ button is read out as. */
  label: string;
  /** The actions offered now; with none the button is not shown. */
  actions: PhotosMenuAction[];
};

/**
 * The ⋯ button of Photos' header and the small menu under it of what can be done on the screen showing. A press
 * anywhere else, or choosing an action, closes it.
 */
export function PhotosMenu({ label, actions }: PhotosMenuProps) {
  const [open, setOpen] = useState(false);
  if (actions.length === 0) return null;
  return (
    <div className="relative z-50 shrink-0">
      <button type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} className="grid size-11 place-items-center">
        <Ellipsis aria-hidden className="size-5" />
      </button>
      {open ? (
        <>
          <button type="button" aria-label="Close menu" tabIndex={-1} onClick={() => setOpen(false)} className="fixed inset-0 cursor-default" />
          <div role="menu" aria-label={label} className="absolute top-full right-0 w-max rounded-lg bg-background p-1 text-foreground shadow-menu">
            {actions.map(({ label: name, icon: Icon, description, onSelect }) => (
              <button key={name} type="button" role="menuitem" aria-label={description} onClick={() => { setOpen(false); onSelect(); }} className="flex min-h-11 w-full items-center gap-3 px-3.5 text-left whitespace-nowrap">
                <Icon aria-hidden className="size-5 shrink-0" />
                {name}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
