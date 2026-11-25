import { Archive, Ellipsis, Forward, Mail, Reply, Trash2 } from "lucide-react";
import { Button } from "../Button.tsx";
import { Mark } from "../Mark.tsx";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../Menu.tsx";

export type InboxMessageActionsProps = {
  /** Fits all message controls into the reader's header menu. */
  compact?: boolean;
  /** The message is unread: marking offers "Mark read"; else "Mark unread". */
  unread?: boolean;
  /** Starts a reply, to the Reply-To address when there is one; offered while the account may send. */
  onReply?: () => void;
  /** Starts a reply to everyone on it. */
  onReplyAll?: () => void;
  /** Starts a forward, carrying the original's attachments where the account can. */
  onForward?: () => void;
  /** Marks the message read or unread, as `unread` says it is not. */
  onToggleRead?: () => void;
  /** Reviews archiving it; offered while the account may change the mailbox. */
  onArchive?: () => void;
  /** Reviews moving it to Trash; offered while the account may change the mailbox. */
  onTrash?: () => void;
  /** Hands the message on screen to Ask Alpha; offered once it has loaded. */
  onAskAlpha?: () => void;
};

/**
 * What can be done with the message open: reply, ask Alpha about it, and the rest in a menu.
 *
 * @model spec/app/inbox/message.md
 */
export function InboxMessageActions({ compact = false, unread = false, onReply, onReplyAll, onForward, onToggleRead, onArchive, onTrash, onAskAlpha }: InboxMessageActionsProps) {
  const more = onReplyAll || onForward || onToggleRead || onArchive || onTrash || (compact && (onReply || onAskAlpha));
  return (
    <div role="toolbar" aria-label="Message" className="flex items-center gap-2">
      {!compact && onReply ? <Button onClick={onReply}><Reply />Reply</Button> : null}
      {!compact && onAskAlpha ? <Button onClick={onAskAlpha} className="bg-alpha text-alpha-foreground hover:bg-alpha/90"><Mark aria-hidden role="presentation" />Ask Alpha</Button> : null}
      {more ? (
        <Menu>
          <MenuTrigger asChild><Button variant={compact ? "ghost" : "secondary"} size="icon" aria-label="More actions" className={compact ? "ml-auto size-11! min-w-11!" : "ml-auto"}><Ellipsis /></Button></MenuTrigger>
          <MenuContent className={compact ? "min-w-52" : undefined}>
            {compact && onReply ? <MenuItem onSelect={onReply}><Reply />Reply</MenuItem> : null}
            {onReplyAll ? <MenuItem onSelect={onReplyAll}><Reply />Reply all</MenuItem> : null}
            {onForward ? <MenuItem onSelect={onForward}><Forward />Forward</MenuItem> : null}
            {compact && onAskAlpha ? <MenuItem onSelect={onAskAlpha}><Mark aria-hidden role="presentation" />Ask Alpha</MenuItem> : null}
            {onToggleRead ? <MenuItem onSelect={onToggleRead}><Mail />{unread ? "Mark read" : "Mark unread"}</MenuItem> : null}
            {onArchive ? <MenuItem onSelect={onArchive}><Archive />Archive</MenuItem> : null}
            {onTrash ? <MenuItem onSelect={onTrash}><Trash2 />Move to Trash</MenuItem> : null}
          </MenuContent>
        </Menu>
      ) : null}
    </div>
  );
}
