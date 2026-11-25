import { CheckCheck, ChevronLeft, Ellipsis, ListChecks, PenLine, Plus, RotateCw, Search, UserRound } from "lucide-react";
import { useRef } from "react";
import { Button } from "../Button.tsx";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "../Menu.tsx";
import { Screen } from "../Screen.tsx";
import { InboxFolderBar, type InboxFolderBarProps, inboxFolders } from "./InboxFolderBar.tsx";
import { InboxList, type InboxListProps } from "./InboxList.tsx";
import { InboxListState, type InboxListStateKind } from "./InboxListState.tsx";
import { InboxNotice, type InboxNoticeKind } from "./InboxNotice.tsx";
import { InboxSearchBar, type InboxSearchBarProps } from "./InboxSearchBar.tsx";
import { InboxSelectionBar, type InboxSelectionBarProps } from "./InboxSelectionBar.tsx";

export type InboxListScreenProps = Pick<InboxListProps, "rows" | "loading" | "onLoadMore" | "loadingMore"> &
  Pick<InboxFolderBarProps, "folder" | "unavailable"> &
  Pick<InboxSearchBarProps, "onSearch"> &
  Pick<InboxSelectionBarProps, "onArchive" | "onTrash" | "onRestore" | "onChooseAll"> & {
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
    /** Called with the folder chosen; offered only where mail can be read, and the folders are shown only with it. */
    onChooseFolder?: InboxFolderBarProps["onChoose"];
    /** What the list is in need of telling: saved, out of date, missing newer mail, or access withdrawn. */
    notice?: InboxNoticeKind;
    /** Does the one thing the notice offers, such as reading the list again. */
    onNoticeAction?: () => void;
    /** Why there is no list to show: shown in its place when there are no rows. */
    state?: InboxListStateKind;
    /** Does what the state asks, such as signing in or connecting Gmail. */
    onStateAction?: () => void;
    /** How many messages are chosen; the selection bar is shown above one or more. */
    chosen?: number;
    /** Puts the list in selection mode, so each row chooses a message. */
    onStartSelection?: () => void;
    /** Leaves selection mode and clears any choices. */
    onFinishSelection?: () => void;
    /** Clears the choices while staying in selection mode. */
    onClearSelection?: () => void;
    /** How many drafts are set aside; the way back to them is shown above none. */
    aside?: number;
    /** Opens the drafts set aside. */
    onShelf?: () => void;
    /** Reads the first page again; offered while mail can be read and no read is under way. */
    onRefresh?: () => void;
    /** Starts a new message; offered once an account is chosen. */
    onCompose?: () => void;
    /** Opens the choice among the connected accounts. */
    onAccount?: () => void;
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
  onArchive, onTrash, onRestore, onChooseAll, aside = 0, onShelf, onRefresh, onCompose, onAccount, rows, loading, onLoadMore, loadingMore,
}: InboxListScreenProps) {
  const focusSearchAfterCloseRef = useRef(false);
  const closeSearch = () => {
    focusSearchAfterCloseRef.current = true;
    onCloseSearch?.();
  };
  const actions = (
    <>
      {onRefresh || loading ? <Button variant="ghost" size="icon" aria-label="Refresh" loading={loading} disabled={!onRefresh} onClick={onRefresh}><RotateCw /></Button> : null}
      <Button variant="ghost" size="icon" aria-label="Search email" disabled={!onOpenSearch} onClick={onOpenSearch} ref={(button) => {
        if (button && focusSearchAfterCloseRef.current) {
          focusSearchAfterCloseRef.current = false;
          button.focus();
        }
      }}><Search /></Button>
      <Button variant="ghost" size="icon" aria-label="Compose" disabled={!onCompose} onClick={onCompose}><Plus /></Button>
      {onStartSelection || onFinishSelection || onAccount || (aside > 0 && onShelf) ? (
        <Menu>
          <MenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Mail options"><Ellipsis /></Button></MenuTrigger>
          <MenuContent>
            {onStartSelection || onFinishSelection ? <MenuItem onSelect={onFinishSelection ?? onStartSelection}><ListChecks />{onFinishSelection ? "Finish selection" : "Select emails"}</MenuItem> : null}
            {onFinishSelection && (onChooseAll || onClearSelection) ? (
              <MenuItem onSelect={onChooseAll ?? onClearSelection}><CheckCheck />{onChooseAll ? "Select all shown" : "Deselect all"}</MenuItem>
            ) : null}
            {onAccount ? <MenuItem onSelect={onAccount}><UserRound />{account ?? "Gmail accounts"}</MenuItem> : null}
            {aside > 0 && onShelf ? <MenuItem onSelect={onShelf}><PenLine />Drafts set aside ({aside})</MenuItem> : null}
          </MenuContent>
        </Menu>
      ) : null}
    </>
  );
  return (
    <Screen
      title={chosen > 0 ? `${chosen} selected` : inboxFolders[folder]}
      leading={searching || onBack ? <Button variant="ghost" size="icon" aria-label={searching ? "Back to inbox" : "Back to apps"} className="ml-1" onClick={searching ? closeSearch : onBack}><ChevronLeft className="size-5" /></Button> : undefined}
      titleControl={searching ? <InboxSearchBar value={search} onValueChange={onSearchChange} onSearch={onSearch} onClose={closeSearch} focusOnOpen /> : undefined}
      actions={searching ? undefined : actions}
      className="[&_header>h1]:pl-0.5 [&_main>div]:gap-2 [&_main>div]:pt-1"
    >
      {searching || !onChooseFolder ? null : <InboxFolderBar folder={folder} unavailable={unavailable} onChoose={onChooseFolder} />}
      {notice ? <InboxNotice kind={notice} onAction={onNoticeAction} /> : null}
      {chosen > 0 ? <InboxSelectionBar count={chosen} onArchive={onArchive} onTrash={onTrash} onRestore={onRestore} /> : null}
      {rows.length === 0 && loading ? <InboxListState kind="loading" />
        : state && rows.length === 0 ? <InboxListState kind={state === "empty" && folder === "sent" ? "emptySent" : state} onAction={onStateAction} />
        : <InboxList rows={rows} loading={loading} onLoadMore={onLoadMore} loadingMore={loadingMore} />}
    </Screen>
  );
}
