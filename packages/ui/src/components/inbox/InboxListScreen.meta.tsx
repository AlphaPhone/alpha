import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxListScreenProps } from "./InboxListScreen.tsx";
import { sampleRows } from "./samples.ts";

const onRefresh = fn();
const onCompose = fn();
const rows = sampleRows.map((row) => ({ ...row, onChosenChange: fn(), onOpen: fn(), onSwipe: fn() }));
const none: Partial<InboxListScreenProps> = { onFinishSelection: undefined, onArchive: undefined, onTrash: undefined, onLoadMore: undefined, onStateAction: undefined, onNoticeAction: undefined };

export const meta: ComponentMeta<InboxListScreenProps> = {
  args: {
    ...none, account: "sam.rivera@gmail.com", folder: "incoming", search: "", rows, onSearchChange: fn(), onSearch: fn(), onChooseFolder: fn(), onOpenSearch: fn(), onCloseSearch: fn(),
    onBack: fn(), onRefresh, onCompose, loading: false, loadingMore: false, chosen: 0,
  },
  examples: {
    "More to read": { onLoadMore: fn() },
    "Two chosen": { chosen: 2, onFinishSelection: fn(), onArchive: fn(), onTrash: fn(), rows: rows.map((row, n) => ({ ...row, selecting: true, chosen: n < 2 })) },
    "Saved list while offline": { notice: "savedList", onNoticeAction: fn(), onRefresh: undefined, onCompose: undefined, rows: rows.map((row) => ({ ...row, onChosenChange: undefined, onSwipe: undefined })) },
    "Draft set aside": { aside: [{ id: "1", onOpen: fn() }] },
    "Two accounts": { accounts: [{ id: "1", email: "sam.rivera@gmail.com" }, { id: "2", email: "sam@work.example" }], onChooseAccount: fn() },
    "Searching": { searching: true, search: "tax", rows: rows.slice(3) },
    "Searching on the launcher": { searching: true, launcher: true, onBack: undefined, search: "tax", rows: rows.slice(3) },
    "Loading first page": { loading: true, rows: [], onRefresh: undefined, onBack: undefined, state: undefined },
    "Signed out": { account: undefined, rows: [], state: "signedOut", onStateAction: fn(), onRefresh: undefined, onCompose: undefined, onChooseFolder: undefined, onSearch: undefined, onOpenSearch: undefined },
    "Needs access": { rows: [], state: "needsAccess", onStateAction: fn(), onRefresh: undefined, onCompose: undefined, onChooseFolder: undefined, onSearch: undefined },
    "Access withdrawn": { rows: [], state: "needsAccess", notice: "reconnect", onNoticeAction: fn(), onRefresh: undefined, onCompose: undefined },
    "Spam unavailable": { folder: "spam", unavailable: true, rows: [], state: "unavailable", onRefresh: undefined },
    "Offline with nothing to show": { rows: [], state: "offline", onStateAction: fn() },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onRefresh.mockClear();
      onCompose.mockClear();
      const canvas = within(canvasElement);
      await expect(canvas.getByRole("heading", { name: "Inbox" })).toBeInTheDocument();
      await userEvent.click(canvas.getByRole("button", { name: "Refresh" }));
      await userEvent.click(canvas.getByRole("button", { name: "Compose" }));
      await expect([onRefresh.mock.calls.length, onCompose.mock.calls.length]).toEqual([1, 1]);
    },
    Searching: ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      return expect([Boolean(canvas.queryByRole("button", { name: "Back to inbox" })), Boolean(canvas.queryByRole("group", { name: "Folder" }))]).toEqual([true, false]);
    },
    "Searching on the launcher": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      await expect([canvas.queryByRole("button", { name: /^Back/ }), Boolean(canvas.getByRole("search", { name: "Search Gmail" })), Boolean(canvas.queryByRole("group", { name: "Folder" }))]).toEqual([null, true, true]);
      const header = canvasElement.querySelector("header")?.getBoundingClientRect();
      const pill = canvas.getByRole("search", { name: "Search Gmail" }).getBoundingClientRect();
      await expect([canvas.getByRole("button", { name: "Clear search" }).getBoundingClientRect().width, pill.left - (header?.left ?? 0), (header?.right ?? 0) - pill.right]).toEqual([40, 16, 16]);
    },
    "Loading first page": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      await expect(within(canvasElement).getByRole("button", { name: "Refresh" })).toHaveAttribute("aria-busy", "true");
    },
  },
};
