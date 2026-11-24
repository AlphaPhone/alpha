import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxListProps } from "./InboxList.tsx";
import { sampleRows as rows } from "./samples.ts";

const onLoadMore = fn();

export const meta: ComponentMeta<InboxListProps> = {
  args: { rows, loading: false, onLoadMore, loadingMore: false },
  examples: {
    "Last page": { onLoadMore: undefined },
    "Loading first page": { rows: [], loading: true, onLoadMore: undefined },
    Refreshing: { loading: true, onLoadMore: undefined },
    "Loading more": { loadingMore: true },
    "Two chosen": { rows: rows.map((row, n) => ({ ...row, chosen: n < 2, onChosenChange: fn() })) },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onLoadMore.mockClear();
      const canvas = within(canvasElement);
      await expect(canvas.getAllByRole("listitem").length).toBe(4);
      await userEvent.click(canvas.getByRole("button", { name: "Load more" }));
      await expect(onLoadMore.mock.calls.length).toBe(1);
    },
    "Loading more": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      await expect(within(canvasElement).getByRole("button", { name: "Load more" })).toHaveAttribute("aria-busy", "true");
    },
  },
};
