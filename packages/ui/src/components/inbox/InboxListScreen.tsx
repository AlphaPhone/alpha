import { PenLine, RefreshCw, SquarePen } from "lucide-react";
import { Avatar } from "../Avatar.tsx";
import { Button } from "../Button.tsx";
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
    /** The address of the account read; the account button shows it as its picture. Left out while none is chosen. */
    account?: string;
    /** What is typed in the search field. */
    search: string;
    /** Called with the search text as it is typed. */
    onSearchChange: (value: string) => void;
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
    /** How many messages are chosen; the selection bar is shown above one or more. */
    chosen?: number;
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
  account, folder, unavailable, onChooseFolder, search, onSearchChange, onSearch, notice, onNoticeAction, state, onStateAction,
  chosen = 0, onArchive, onTrash, onRestore, onChooseAll, aside = 0, onShelf, onRefresh, onCompose, onAccount, rows, loading, onLoadMore, loadingMore,
}: InboxListScreenProps) {
  const actions = (
    <>
      {onRefresh || loading ? <Button variant="ghost" size="icon" aria-label="Refresh" loading={loading} disabled={!onRefresh} onClick={onRefresh}><RefreshCw /></Button> : null}
      {onCompose ? <Button variant="ghost" size="icon" aria-label="Compose" onClick={onCompose}><SquarePen /></Button> : null}
      {onAccount ? <Button variant="ghost" size="icon" aria-label={account ? `Account ${account}` : "Account"} onClick={onAccount}><Avatar name={account ?? "?"} size="sm" /></Button> : null}
    </>
  );
  return (
    <Screen title={inboxFolders[folder]} actions={actions}>
      <InboxSearchBar value={search} onValueChange={onSearchChange} onSearch={onSearch} />
      <InboxFolderBar folder={folder} unavailable={unavailable} onChoose={onChooseFolder} />
      {notice ? <InboxNotice kind={notice} onAction={onNoticeAction} /> : null}
      {aside > 0 && onShelf ? <Button variant="secondary" size="sm" onClick={onShelf} className="self-start"><PenLine />{aside}<span className="sr-only"> drafts set aside</span></Button> : null}
      {chosen > 0 ? <InboxSelectionBar count={chosen} onArchive={onArchive} onTrash={onTrash} onRestore={onRestore} onChooseAll={onChooseAll} /> : null}
      {state && rows.length === 0 && !loading ? <InboxListState kind={state} onAction={onStateAction} /> : <InboxList rows={rows} loading={loading} onLoadMore={onLoadMore} loadingMore={loadingMore} />}
    </Screen>
  );
}
