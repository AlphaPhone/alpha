import { Archive, Check, ChevronDown, FileText, Inbox, Mail, Send, ShieldAlert, Star, Trash2 } from "lucide-react";
import { useRef } from "react";
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
  const moreLabel = moreSelected ? inboxFolders[folder] : "More";
  const pointerRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
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
      <Menu modal={false}>
        <MenuTrigger asChild>
          <Button ref={triggerRef} variant="secondary" size="sm" aria-label={moreSelected ? `${moreLabel}, more folders` : "More folders"} disabled={!onChoose}
            onPointerDown={() => { pointerRef.current = true; }} onKeyDown={() => { pointerRef.current = false; }}
            className={cn("h-11 gap-3 px-3.5 before:inset-0", moreSelected && "w-28 justify-start bg-foreground text-background hover:bg-foreground active:bg-foreground")}>
            {moreLabel}<ChevronDown aria-hidden className="size-4" />
          </Button>
        </MenuTrigger>
        <MenuContent align="end" sideOffset={8} aria-label="Mail folders"
          onCloseAutoFocus={(event) => {
            if (!pointerRef.current) return;
            event.preventDefault();
            triggerRef.current?.focus({ preventScroll: true, focusVisible: false });
          }}
          className="w-56 gap-0 border border-border p-1.5 shadow-md">
          {moreFolders.map((name) => {
            const Icon = icons[name];
            const current = name === folder;
            return (
              <MenuItem key={name} role="menuitemradio" aria-checked={current} disabled={refused(name)} onSelect={() => !current && onChoose?.(name)}
                className={cn("min-h-12 rounded-option px-3 py-2.5 leading-row hover:bg-secondary data-highlighted:bg-secondary", current && "bg-secondary font-semibold")}>
                <Icon aria-hidden className="size-5" /><span className="min-w-0 flex-1">{inboxFolders[name]}</span><Check aria-hidden className={cn("size-4.5", !current && "invisible")} />
              </MenuItem>
            );
          })}
        </MenuContent>
      </Menu>
    </div>
  );
}
