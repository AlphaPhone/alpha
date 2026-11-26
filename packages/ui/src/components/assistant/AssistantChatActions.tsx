import { Clock, Paperclip, Plus, Search } from "lucide-react";
import { Button } from "../Button.tsx";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../Menu.tsx";
import { cn } from "../../lib/cn.ts";

export interface AssistantChatActionsProps {
  /** Positions the actions beside the field on the specified composer. */
  placement: "bar" | "sheet" | "contact";
  /** Identifies the current trigger for the sheet's return focus. */
  triggerId?: string;
  disabled?: boolean;
  onAttach?: () => void;
  onSearch?: () => void;
  onNew?: () => void;
  making?: boolean;
  onHistory?: () => void;
}

/** The available Ask Alpha actions beside a composer. */
export function AssistantChatActions({ placement, triggerId, disabled, onAttach, onSearch, onNew, making, onHistory }: AssistantChatActionsProps) {
  const visible = Boolean(onAttach || onSearch || onNew || making || onHistory);
  return (
    <Menu>
      <MenuTrigger asChild>
        <Button id={triggerId} variant="ghost" size="icon" aria-label="Chat actions" disabled={disabled || !visible} className="hover:bg-transparent disabled:opacity-40"><Plus /></Button>
      </MenuTrigger>
      <MenuContent side="top" align="start" alignOffset={placement === "sheet" ? -16 : -57} sideOffset={20}
        className={cn("rounded-tile border-0 bg-background p-2 shadow-dock-compact dark:shadow-dock-compact-dark [&>[role=menuitem]]:min-h-12 [&>[role=menuitem]]:rounded-md [&>[role=menuitem]]:px-3", placement === "contact" ? "min-w-59" : "min-w-55")}>
        {onAttach ? <MenuItem onSelect={onAttach}><Paperclip aria-hidden />Attach media</MenuItem> : null}
        {onSearch ? <MenuItem onSelect={onSearch}><Search aria-hidden />Search chat</MenuItem> : null}
        {onNew || making ? <MenuItem disabled={making} onSelect={onNew}><Plus aria-hidden />New chat</MenuItem> : null}
        {onHistory ? <MenuItem onSelect={onHistory}><Clock aria-hidden />Chat history</MenuItem> : null}
      </MenuContent>
    </Menu>
  );
}
