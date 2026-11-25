import { Archive, ChevronDown, FileText, Inbox, Mail, Send, ShieldAlert, Star, Trash2 } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";
import { Chip } from "../Chip.tsx";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../Menu.tsx";

export const inboxFolders = { incoming: "Inbox", starred: "Starred", sent: "Sent", drafts: "Drafts", allMail: "All mail", archived: "Archive", spam: "Spam", trashed: "Trash" } as const;
export type InboxFolder = keyof typeof inboxFolders;

const primaryFolders = ["incoming", "sent", "archived"] as const;
const moreFolders = ["starred", "allMail", "drafts", "spam", "trashed"] as const;
const icons = { incoming: Inbox, starred: Star, sent: Send, drafts: FileText, allMail: Mail, archived: Archive, spam: ShieldAlert, trashed: Trash2 } satisfies Record<InboxFolder, typeof Inbox>;

export type InboxFolderBarProps = {
  /** The folder shown. */
  folder: InboxFolder;
  /** Spam and Trash cannot be read for this account: they are shown but refuse. */
  unavailable?: boolean;
  /** Called with the folder chosen; a folder is offered only where mail can be read, and the one shown does nothing. Left out, every folder refuses. */
  onChoose?: (folder: InboxFolder) => void;
};

/**
 * Inbox, Sent and Archive, with the account's other folders in a menu. Choosing one reads its first page.
 *
 * @model spec/app/inbox/index.md
 */
export function InboxFolderBar({ folder, unavailable = false, onChoose }: InboxFolderBarProps) {
  const moreSelected = moreFolders.some((name) => name === folder);
  const refused = (name: InboxFolder) => !onChoose || (unavailable && (name === "spam" || name === "trashed"));
  return (
    <div role="group" aria-label="Folder" tabIndex={0} className={cn(focusRing, "-mx-4 flex touch-pan-x gap-2 overflow-x-auto px-5 pb-1.5")}>
      {primaryFolders.map((name) => {
        const Icon = icons[name];
        return (
          <Chip key={name} pressed={name === folder} disabled={refused(name)} onPressedChange={() => name !== folder && onChoose?.(name)} className="h-11 shrink-0 [&>button]:h-11 [&>button]:px-3">
            <span className="inline-flex items-center gap-1.5"><Icon size={16} aria-hidden />{inboxFolders[name]}</span>
          </Chip>
        );
      })}
      <Menu>
        <MenuTrigger asChild>
          <Button variant="secondary" size="sm" aria-label="More folders" disabled={!onChoose} className={cn("h-11 px-3 before:inset-0", moreSelected && "bg-foreground text-background hover:bg-foreground active:bg-foreground")}>
            {moreSelected ? inboxFolders[folder] : "More"}<ChevronDown size={16} aria-hidden />
          </Button>
        </MenuTrigger>
        <MenuContent align="start">
          {moreFolders.map((name) => {
            const Icon = icons[name];
            return <MenuItem key={name} disabled={refused(name)} aria-current={name === folder ? "page" : undefined} onSelect={() => name !== folder && onChoose?.(name)}><Icon aria-hidden />{inboxFolders[name]}</MenuItem>;
          })}
        </MenuContent>
      </Menu>
    </div>
  );
}
