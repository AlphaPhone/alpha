import { Camera, Paperclip, Plus, Search, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../Button.tsx";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../Menu.tsx";
import { cn } from "../../lib/cn.ts";

type ChatActionsPlacement = "bar" | "sheet" | "comms";

export interface AssistantChatActionsProps {
  /** Positions the actions beside the field on the specified composer. */
  placement: ChatActionsPlacement;
  /** Identifies the current trigger for the sheet's return focus. */
  triggerId?: string;
  disabled?: boolean;
  onAttach?: () => void;
  onSearch?: () => void;
}

interface ChatActionsMenuProps {
  placement: ChatActionsPlacement;
  label: string;
  triggerId?: string;
  disabled?: boolean;
  children: ReactNode;
}

function ChatActionsMenu({ placement, label, triggerId, disabled, children }: ChatActionsMenuProps) {
  const comms = placement === "comms";
  const sideOffset = comms ? 19 : 20;
  return (
    <Menu>
      <MenuTrigger asChild>
        <Button id={triggerId} variant="ghost" size="icon" aria-label={label} disabled={disabled} className="hover:bg-transparent disabled:opacity-40"><Plus /></Button>
      </MenuTrigger>
      <MenuContent side="top" align="start" alignOffset={placement === "sheet" ? -16 : -57} sideOffset={sideOffset}
        className={cn("rounded-tile border-0 bg-background p-2 shadow-chat-actions dark:shadow-chat-actions-dark [&>[role=menuitem]]:min-h-12 [&>[role=menuitem]]:rounded-md [&>[role=menuitem]]:px-3 [&>[role=menuitem]_svg]:size-5.5", comms ? "min-w-59" : "min-w-55")}>
        {children}
      </MenuContent>
    </Menu>
  );
}

/** The available Ask Alpha actions beside a composer. */
export function AssistantChatActions({ placement, triggerId, disabled, onAttach, onSearch }: AssistantChatActionsProps) {
  const visible = Boolean(onAttach || onSearch);
  return (
    <ChatActionsMenu placement={placement} label="Chat actions" triggerId={triggerId} disabled={disabled || !visible}>
      {onAttach ? <MenuItem onSelect={onAttach}><Paperclip aria-hidden />Attach media</MenuItem> : null}
      {onSearch ? <MenuItem onSelect={onSearch}><Search aria-hidden />Search chat</MenuItem> : null}
    </ChatActionsMenu>
  );
}

export interface MessageAttachmentsMenuProps {
  media?: { camera: () => void; files: () => void };
  onSuggest?: () => void;
}

/** The media actions beside a text field, when the current message can use them. */
export function MessageAttachmentsMenu({ media, onSuggest }: MessageAttachmentsMenuProps) {
  if (!media && !onSuggest) return null;
  return (
    <ChatActionsMenu placement="comms" label="Message attachments">
      {media ? <>
        <MenuItem onSelect={media.camera}><Camera aria-hidden />Camera</MenuItem>
        <MenuItem onSelect={media.files}><Paperclip aria-hidden />Add media</MenuItem>
      </> : null}
      {onSuggest ? <MenuItem onSelect={onSuggest}><Sparkles aria-hidden />Let Alpha suggest a reply</MenuItem> : null}
    </ChatActionsMenu>
  );
}
