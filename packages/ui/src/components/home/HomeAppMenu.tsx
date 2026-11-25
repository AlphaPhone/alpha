import { Info, Plus } from "lucide-react";
import { type ReactNode, useRef } from "react";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../Menu.tsx";

export type HomeAppMenuProps = {
  /** The menu is open; the parent keeps which app's. */
  open: boolean;
  /** The app's name, as the menu's title. */
  label: string;
  /** The app is on Home already: the menu says so instead of offering to add it. */
  onHome: boolean;
  /** Adds the app to Home and closes the drawer; left out while a change is being saved, so the row refuses. */
  onAddToHome?: () => void;
  /** Hands the app to Android's App info; left out while Android is being asked something else. */
  onShowAppInfo?: () => void;
  /** Closes the menu: Back, Escape or a press outside. */
  onClose: () => void;
  /** The drawer tile the menu opens against. */
  children?: ReactNode;
};

/** An installed app's menu in the Apps drawer, opened by a long press: Add to Home or On Home, and App info. */
export function HomeAppMenu({ open, label, onHome, onAddToHome, onShowAppInfo, onClose, children }: HomeAppMenuProps) {
  const tile = useRef<HTMLDivElement | null>(null);
  return (
    <div ref={tile} className="relative min-w-0">
      {children}
      <Menu open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
        <MenuTrigger aria-hidden tabIndex={-1} className="pointer-events-none invisible absolute inset-x-0 top-18 h-0" />
        <MenuContent
          align="center"
          sideOffset={0}
          aria-label={label}
          className="min-w-42.5 rounded-lg border-0 bg-background text-foreground"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            tile.current?.querySelector<HTMLButtonElement>("button:not([aria-hidden])")?.focus();
          }}
        >
          <MenuItem className="min-h-11 gap-2.5 px-2.5 text-sm" disabled={onHome || !onAddToHome} onSelect={(event) => {
            event.preventDefault();
            onAddToHome?.();
          }}>
            <Plus className="size-4.5" />{onHome ? "On Home" : "Add to Home"}
          </MenuItem>
          {onShowAppInfo ? (
            <MenuItem className="min-h-11 gap-2.5 px-2.5 text-sm" onSelect={(event) => {
              event.preventDefault();
              onShowAppInfo();
            }}>
              <Info className="size-4.5" />App info
            </MenuItem>
          ) : null}
        </MenuContent>
      </Menu>
    </div>
  );
}
