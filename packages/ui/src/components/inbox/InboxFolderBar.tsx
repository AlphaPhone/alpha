import { cn, focusRing } from "../../lib/cn.ts";
import { Chip } from "../Chip.tsx";

export const inboxFolders = { incoming: "Inbox", starred: "Starred", sent: "Sent", drafts: "Drafts", allMail: "All mail", archived: "Archive", spam: "Spam", trashed: "Trash" } as const;
export type InboxFolder = keyof typeof inboxFolders;

export type InboxFolderBarProps = {
  /** The folder shown. */
  folder: InboxFolder;
  /** Spam and Trash cannot be read for this account: they are shown but refuse. */
  unavailable?: boolean;
  /** Called with the folder chosen; a folder is offered only where mail can be read, and the one shown does nothing. Left out, every folder refuses. */
  onChoose?: (folder: InboxFolder) => void;
};

/**
 * The folders of the account, one row to scroll along, the one shown filled. Choosing one reads its first page.
 *
 * @model spec/app/inbox/index.md
 */
export function InboxFolderBar({ folder, unavailable = false, onChoose }: InboxFolderBarProps) {
  return (
    <div role="group" aria-label="Folder" tabIndex={0} className={cn(focusRing, "-mx-4 flex gap-2 overflow-x-auto px-4 py-1")}>
      {(Object.keys(inboxFolders) as InboxFolder[]).map((name) => (
        <Chip
          key={name}
          pressed={name === folder}
          disabled={!onChoose || (unavailable && (name === "spam" || name === "trashed"))}
          onPressedChange={() => name !== folder && onChoose?.(name)}
          className="shrink-0"
        >
          {inboxFolders[name]}
        </Chip>
      ))}
    </div>
  );
}
