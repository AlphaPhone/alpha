import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { recents, recentsNeedAccess } from "./fixtures.ts";
import type { RecentsListProps } from "./RecentsList.tsx";

export const meta: ComponentMeta<RecentsListProps> = {
  args: { phone: recents, now: recents.readAt, onCall: fn(), onAllow: fn(), onRefresh: fn(), onClearQuery: fn() },
  examples: {
    NeedsAccess: { phone: recentsNeedAccess },
    ReadFailed: { phone: { ...recents, recents: [], notice: { tag: "ReadFailed" } } },
    AlphaFiltered: { phone: { ...recents, listQuery: { tag: "AlphaQuery", query: "Maya", label: "Maya" } } },
    Dialing: { phone: { ...recents, dialing: true } },
  },
  play: {
    Default: async ({ canvasElement, args }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: /Call Maya Chen/ }));
      await expect(args.onCall).toHaveBeenCalledWith("4155550100");
    },
    NeedsAccess: async ({ canvasElement, args }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Allow" }));
      await expect(args.onAllow).toHaveBeenCalled();
      await expect(args.onCall).not.toHaveBeenCalled();
    },
    AlphaFiltered: async ({ canvasElement, args }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: /Clear filter Maya/ }));
      await expect(args.onClearQuery).toHaveBeenCalled();
    },
  },
};
