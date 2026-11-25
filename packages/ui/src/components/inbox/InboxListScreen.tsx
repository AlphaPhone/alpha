import { Archive, Check, ChevronLeft, Ellipsis, Mail, MailOpen, Plus, RotateCw, Search, Star, Trash2 } from "lucide-react";
import { useRef } from "react";
import { cn, focusRing } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../Menu.tsx";
import { Screen } from "../Screen.tsx";
import { InboxFolderBar, type InboxFolderBarProps, inboxFolders } from "./InboxFolderBar.tsx";
import { InboxList, type InboxListProps } from "./InboxList.tsx";
import { InboxListState, type InboxListStateKind } from "./InboxListState.tsx";
import { InboxNotice, type InboxNoticeKind } from "./InboxNotice.tsx";
import { InboxSearchBar, type InboxSearchBarProps } from "./InboxSearchBar.tsx";

const actionChip = cn(focusRing, "min-h-9 shrink-0 rounded-action bg-secondary px-3 text-caption whitespace-nowrap text-secondary-foreground disabled:opacity-50");

/** What an empty folder says, as develop's list words it: Starred, All mail and Spam read as a search. */
const emptyIn = {
  incoming: "empty", sent: "emptySent", archived: "emptyArchive", trashed: "emptyTrash", drafts: "emptyDrafts", starred: "noResults", allMail: "noResults", spam: "noResults",
} as const satisfies Record<InboxListScreenProps["folder"], InboxListStateKind>;

export type InboxListScreenProps = Pick<InboxListProps, "rows" | "loading" | "onLoadMore" | "loadingMore"> &
  Pick<InboxFolderBarProps, "folder" | "unavailable"> &
  Pick<InboxSearchBarProps, "onSearch"> &
  {
    /** Reviews archiving the messages chosen; offered only where the grant allows changing the mailbox. */
    onArchive?: () => void;
    /** Reviews moving the messages chosen to Trash; offered only where the grant allows changing the mailbox. */
    onTrash?: () => void;
    /** Reviews putting the messages chosen back where they were, in Archive or Trash; offered only there. */
    onRestore?: () => void;
    /** The selected account can change tags on the mail it shows. */
    labelChanges?: boolean;
    /** Reviews adding stars, or removing them from the Starred folder. */
    onStar?: () => void;
    /** Reviews marking the chosen messages as read. */
    onMarkRead?: () => void;
    /** Reviews marking the chosen messages as unread. */
    onMarkUnread?: () => void;
    /** Chooses every message the list shows; offered while some shown are not chosen. */
    onChooseAll?: () => void;
    /** The address of the account whose mail is shown. */
    account?: string;
    /** Returns from Inbox to the apps. */
    onBack?: () => void;
    /** Whether the list header holds its search field. */
    searching?: boolean;
    /** What is typed in the search field. */
    search: string;
    /** Called with the search text as it is typed. */
    onSearchChange: (value: string) => void;
    /** Opens the search field; offered when the folder can be searched. */
    onOpenSearch?: () => void;
    /** Closes the search and returns to the unfiltered folder. */
    onCloseSearch?: () => void;
    /** Called with the folder chosen; offered only where mail can be read. */
    onChooseFolder?: InboxFolderBarProps["onChoose"];
    /** What the list is in need of telling: saved, out of date, missing newer mail, or access withdrawn. */
    notice?: InboxNoticeKind;
    /** Does the one thing the notice offers, such as reading the list again. */
    onNoticeAction?: () => void;
    /** Why there is no list to show: shown in its place when there are no rows. */
    state?: InboxListStateKind;
    /** Does what the state asks, such as signing in or connecting Gmail. */
    onStateAction?: () => void;
    /** How many messages are chosen; while selecting, the title counts them. */
    chosen?: number;
    /** Puts the list in selection mode, so each row chooses a message. */
    onStartSelection?: () => void;
    /** Leaves selection mode and clears any choices. */
    onFinishSelection?: () => void;
    /** Clears the choices while staying in selection mode. */
    onClearSelection?: () => void;
    /** Reads the first page again; offered while mail can be read and no read is under way. */
    onRefresh?: () => void;
    /** Starts a new message; offered once an account is chosen. */
    onCompose?: () => void;
    /** The accounts mail can be read from; with more than one, each is a chip under the folders that shows its mail. */
    accounts?: { id: string; email: string }[];
    /** Shows the mail of the account chosen among `accounts`. */
    onChooseAccount?: (id: string) => void;
    /** The drafts set aside, each offered as "Open local draft" under the folders, which brings it back as it was left. */
    aside?: { id: string; onOpen?: () => void }[];
  };

/**
 * The Inbox screen: the folder's messages for one account and search, with its folders, search, what is chosen, the
 * saved-list and access notices, and the way to compose, refresh, choose an account and read further back.
 *
 * @model spec/app/inbox/index.md
 */
export function InboxListScreen({
  account, onBack, folder, unavailable, onChooseFolder, searching = false, search, onSearchChange, onSearch, onOpenSearch, onCloseSearch,
  notice, onNoticeAction, state, onStateAction, chosen = 0, onStartSelection, onFinishSelection, onClearSelection,
  onArchive, onTrash, onRestore, labelChanges = false, onStar, onMarkRead, onMarkUnread, onChooseAll, onRefresh, onCompose, accounts = [], onChooseAccount, aside = [], rows, loading, onLoadMore, loadingMore,
}: InboxListScreenProps) {
  const focusSearchAfterCloseRef = useRef(false);
  const closeSearch = () => {
    focusSearchAfterCloseRef.current = true;
    onCloseSearch?.();
  };
  const compose = onCompose ?? (state === "signedOut" ? onStateAction : undefined);
  const actions = (
    <>
      {onRefresh || loading ? <Button variant="ghost" size="icon" aria-label="Refresh" loading={loading} disabled={!onRefresh} onClick={onRefresh}><RotateCw className="size-5" /></Button> : null}
      {state !== "signedOut" && <Button variant="ghost" size="icon" aria-label="Search email" disabled={!onOpenSearch} onClick={onOpenSearch} ref={(button) => {
        if (button && focusSearchAfterCloseRef.current) {
          focusSearchAfterCloseRef.current = false;
          button.focus();
        }
      }}><Search className="size-5" /></Button>}
      <Button variant="ghost" size="icon" aria-label="Compose" disabled={!compose} onClick={compose}><Plus className="size-5" /></Button>
      {onStartSelection || onFinishSelection ? (
        <Menu>
          <MenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Mail options"><Ellipsis /></Button></MenuTrigger>
          <MenuContent className="min-w-52">
            <MenuItem onSelect={onFinishSelection ?? onStartSelection}><Check className="size-5.5" />{onFinishSelection ? "Finish selection" : "Select emails"}</MenuItem>
            {onFinishSelection ? (
              <>
                <MenuItem disabled={!onChooseAll && !onClearSelection} onSelect={onChooseAll ?? onClearSelection}><Check className="size-5.5" />{onChooseAll || !onClearSelection ? "Select all shown" : "Deselect all"}</MenuItem>
                {folder === "archived" || folder === "trashed"
                  ? <MenuItem disabled={!onRestore} onSelect={onRestore}><Archive className="size-5.5" />{folder === "trashed" ? "Restore from Trash" : "Restore to Inbox"}</MenuItem>
                  : <MenuItem disabled={!onArchive} onSelect={onArchive}><Archive className="size-5.5" />Archive</MenuItem>}
                {folder === "trashed" ? null : <MenuItem disabled={!onTrash} onSelect={onTrash}><Trash2 className="size-5.5" />Move to Trash</MenuItem>}
                {labelChanges ? <>
                  <MenuItem disabled={!onStar} onSelect={onStar}><Star className="size-5.5" />{folder === "starred" ? "Remove stars" : "Star"}</MenuItem>
                  <MenuItem disabled={!onMarkRead} onSelect={onMarkRead}><MailOpen className="size-5.5" />Mark as read</MenuItem>
                  <MenuItem disabled={!onMarkUnread} onSelect={onMarkUnread}><Mail className="size-5.5" />Mark as unread</MenuItem>
                </> : null}
              </>
            ) : null}
          </MenuContent>
        </Menu>
      ) : null}
    </>
  );
  return (
    <Screen
      title={chosen > 0 || onFinishSelection ? `${chosen} selected` : inboxFolders[folder]}
      leading={searching || onBack ? <Button variant="ghost" size="icon" aria-label={searching ? "Back to inbox" : "Back to apps"} onClick={searching ? closeSearch : onBack}><ChevronLeft className="size-5.5" /></Button> : undefined}
      titleControl={searching ? <InboxSearchBar value={search} onValueChange={onSearchChange} onSearch={onSearch} onClose={closeSearch} focusOnOpen /> : undefined}
      actions={searching ? undefined : actions}
      className="[&_main>div]:gap-0 [&_main>div]:pt-1"
    >
      {!searching && state !== "signedOut" ? <InboxFolderBar folder={folder} unavailable={unavailable} onChoose={onChooseFolder} /> : null}
      {!searching && (aside.length > 0 || accounts.length > 1) ? (
        <div role="group" aria-label="Mail actions" className="-mx-4 flex touch-pan-x gap-2 overflow-x-auto px-5 pb-2">
          {aside.map(({ id, onOpen }) => (
            <button key={id} type="button" disabled={!onOpen} onClick={onOpen} className={actionChip}>Open local draft</button>
          ))}
          {accounts.length > 1 ? accounts.map(({ id, email }) => (
            <button key={id} type="button" aria-label={email} aria-pressed={email === account} disabled={!onChooseAccount} onClick={() => onChooseAccount?.(id)} className={actionChip}>{email}</button>
          )) : null}
        </div>
      ) : null}
      {state === "signedOut" && onStateAction ? <Button variant="secondary" size="sm" className="ml-1 self-start px-3 font-medium" onClick={onStateAction}>Connect Eliza Cloud</Button> : null}
      {notice ? <InboxNotice kind={notice} onAction={onNoticeAction} plain /> : null}
      {rows.length === 0 && loading ? <InboxListState kind="loading" />
        : state && rows.length === 0 ? <InboxListState kind={state === "empty" ? emptyIn[folder] : state} onAction={onStateAction} />
        : <InboxList rows={rows} searching={searching} loading={loading} onLoadMore={onLoadMore} loadingMore={loadingMore} />}
    </Screen>
  );
}
