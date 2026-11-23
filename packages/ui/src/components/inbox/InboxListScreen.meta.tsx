import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxListScreenProps } from "./InboxListScreen.tsx";
import { sampleRows } from "./samples.ts";

const onRefresh = fn();
const onCompose = fn();
const onAccount = fn();
const rows = sampleRows.map((row) => ({ ...row, onChosenChange: fn(), onOpen: fn(), onSwipe: fn() }));
const none: Partial<InboxListScreenProps> = { onArchive: undefined, onTrash: undefined, onLoadMore: undefined, onShelf: undefined, onStateAction: undefined, onNoticeAction: undefined };

export const meta: ComponentMeta<InboxListScreenProps> = {
  args: {
    ...none, account: "sam.rivera@gmail.com", folder: "incoming", search: "", rows, onSearchChange: fn(), onSearch: fn(), onChooseFolder: fn(),
    onRefresh, onCompose, onAccount, loading: false, loadingMore: false, chosen: 0, aside: 0,
  },
  examples: {
    "More to read": { onLoadMore: fn() },
    "Two chosen": { chosen: 2, onArchive: fn(), onTrash: fn(), rows: rows.map((row, n) => ({ ...row, chosen: n < 2 })) },
    "Saved list while offline": { notice: "savedList", onNoticeAction: fn(), onRefresh: undefined, onCompose: undefined, rows: rows.map((row) => ({ ...row, onChosenChange: undefined, onSwipe: undefined })) },
    "Drafts set aside": { aside: 2, onShelf: fn() },
    "Searching": { search: "tax", rows: rows.slice(3) },
    "Loading first page": { loading: true, rows: [], onRefresh: undefined, state: undefined },
    "Signed out": { account: undefined, rows: [], state: "signedOut", onStateAction: fn(), onRefresh: undefined, onCompose: undefined, onAccount: undefined, onChooseFolder: undefined, onSearch: undefined },
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
    "Loading first page": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      await expect(within(canvasElement).getByRole("button", { name: "Refresh" })).toHaveAttribute("aria-busy", "true");
    },
  },
};
