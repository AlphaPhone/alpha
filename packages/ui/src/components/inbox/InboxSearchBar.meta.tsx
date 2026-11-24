import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxSearchBarProps } from "./InboxSearchBar.tsx";

const onSearch = fn();

export const meta: ComponentMeta<InboxSearchBarProps> = {
  args: { value: "tax", onSearch },
  examples: { Empty: { value: "" }, "Cannot search": { onSearch: undefined } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onSearch.mockClear();
      await userEvent.type(within(canvasElement).getByRole("searchbox", { name: "Search mail" }), "{Enter}");
      await expect(onSearch.mock.calls).toEqual([["tax"]]);
    },
    "Cannot search": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      await expect(within(canvasElement).getByRole("searchbox", { name: "Search mail" })).toBeDisabled();
    },
  },
};
