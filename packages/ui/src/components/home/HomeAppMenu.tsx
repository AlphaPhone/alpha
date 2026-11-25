import { Info, Plus } from "lucide-react";
import { type ReactNode, useRef } from "react";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../Menu.tsx";

export type HomeAppMenuProps = {
  /** The app's name, as the menu's title. */
  label: string;
  /** The drawer tile the menu opens against. */
  children: ReactNode;
  /** The actions of the selected app, available while its menu is open. */
  actions?: {
    onHome: boolean;
    add?: () => void;
    info?: () => void;
    close: () => void;
  };
};

/** The menu anchored below an installed app's tile. */
export function HomeAppMenu({ label, children, actions }: HomeAppMenuProps) {
  const tileRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={tileRef} className="relative w-full min-w-0">
      {children}
      <Menu open={actions !== undefined} onOpenChange={(open) => { if (!open) actions?.close(); }}>
        <MenuTrigger aria-hidden tabIndex={-1} className="pointer-events-none invisible absolute inset-x-0 top-18 h-0" />
        {actions && <MenuContent align="center" aria-label={label} aria-labelledby={undefined} className="min-w-42.5 rounded-lg border-0 bg-background p-1.5 text-foreground"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const trigger = tileRef.current?.querySelector<HTMLButtonElement>("button:not([aria-hidden])");
            if (trigger && !trigger.disabled && !trigger.closest("[inert]")) trigger.focus();
          }}>
          <MenuItem disabled={actions.onHome || !actions.add}
            className="min-h-11 gap-2.5 px-2.5 text-sm" onSelect={(event) => { event.preventDefault(); actions.add?.(); }}>
            <Plus className="size-4.5" />{actions.onHome ? "On Home" : "Add to Home"}
          </MenuItem>
          <MenuItem disabled={!actions.info} className="min-h-11 gap-2.5 px-2.5 text-sm"
            onSelect={(event) => { event.preventDefault(); actions.info?.(); }}>
            <Info className="size-4.5" />App info
          </MenuItem>
        </MenuContent>}
      </Menu>
    </div>
  );
}
