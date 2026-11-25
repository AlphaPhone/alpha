import { Clock, Paperclip, Plus, Search } from "lucide-react";
import { Button } from "../Button.tsx";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../Menu.tsx";

export type AssistantChatToolsProps = {
  /** Opens the picker for photos and documents. */
  onAttach?: () => void;
  /** Opens search across every conversation. */
  onSearch?: () => void;
  /** Starts a new conversation; offered only while the turn and the composer are free. */
  onNew?: () => void;
  /** Shows the conversations inside the sheet. */
  onHistory?: () => void;
};

/**
 * The composer's `+`: Chat actions, a menu of Attach media, Search chat, New chat and Chat history, each offered only
 * as its handler is given, as Alpha had it before VibeStack.
 * @model spec/app/assistant/chats.md
 */
export function AssistantChatTools({ onAttach, onSearch, onNew, onHistory }: AssistantChatToolsProps) {
  const offered = Boolean(onAttach || onSearch || onNew || onHistory);
  return (
    <Menu>
      <MenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Chat actions" disabled={!offered}><Plus className="size-6" /></Button>
      </MenuTrigger>
      <MenuContent side="top" align="start" sideOffset={12} className="min-w-55 border-0 p-2 shadow-menu">
        {onAttach ? <MenuItem onSelect={onAttach}><Paperclip aria-hidden />Attach media</MenuItem> : null}
        {onSearch ? <MenuItem onSelect={onSearch}><Search aria-hidden />Search chat</MenuItem> : null}
        {onNew ? <MenuItem onSelect={onNew}><Plus aria-hidden />New chat</MenuItem> : null}
        {onHistory ? <MenuItem onSelect={onHistory}><Clock aria-hidden />Chat history</MenuItem> : null}
      </MenuContent>
    </Menu>
  );
}
