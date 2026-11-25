import type { LucideIcon } from "lucide-react";
import { Ellipsis } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../Menu.tsx";

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
 * anywhere else, Escape, or choosing an action closes it.
 */
export function PhotosMenu({ label, actions }: PhotosMenuProps) {
  if (actions.length === 0) return null;
  return (
    <div className="relative shrink-0">
      <Menu>
        <MenuTrigger asChild>
          <button type="button" aria-label={label} className={cn(focusRing, "grid size-11 place-items-center rounded-full active:bg-accent")}>
            <Ellipsis aria-hidden className="size-5" />
          </button>
        </MenuTrigger>
        <MenuContent align="end" aria-label={label}>
          {actions.map(({ label: name, icon: Icon, description, onSelect }) => (
            <MenuItem key={name} aria-label={description} onSelect={onSelect}>
              <Icon aria-hidden className="size-5 shrink-0" />
              {name}
            </MenuItem>
          ))}
        </MenuContent>
      </Menu>
    </div>
  );
}
