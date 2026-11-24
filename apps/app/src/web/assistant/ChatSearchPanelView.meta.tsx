import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { ChatSearchPanelViewProps } from "./ChatSearchPanelView.tsx";
import { searchHits, searchPage } from "./fixtures.ts";

export const meta: ComponentMeta<ChatSearchPanelViewProps> = {
  args: { query: "milk", hits: searchHits, results: true, canLoadMore: false, onQuery: fn(), onBack: fn(), onOpenHit: fn(), onMore: fn() },
  examples: {
    NotSearchedYet: { query: "", hits: [], results: false },
    Searching: { query: "milk on the way", hits: [], results: false },
    NoMatches: { query: "passport renewal", hits: [], results: true },
    FullPage: { query: "airport", hits: searchPage, canLoadMore: true },
  },
  play: {
    Default: async ({ args, canvasElement }: { args: ChatSearchPanelViewProps; canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: /buy milk on the way home/ }));
      await expect(args.onOpenHit).toHaveBeenCalledWith(searchHits[0]);
      await userEvent.click(canvas.getByRole("button", { name: "Back to chat" }));
      await expect(args.onBack).toHaveBeenCalledTimes(1);
    },
    NoMatches: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByText("No matches")).toBeTruthy(),
    FullPage: async ({ args, canvasElement }: { args: ChatSearchPanelViewProps; canvasElement: HTMLElement }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: "More" }));
      await expect(args.onMore).toHaveBeenCalledTimes(1);
    },
  },
};
