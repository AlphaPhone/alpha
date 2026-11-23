import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { threads, threadsFailed, threadsFiltered, threadsNeedAccess } from "./fixtures.ts";
import type { ThreadListProps } from "./ThreadList.tsx";

export const meta: ComponentMeta<ThreadListProps> = {
  args: { messages: threads, now: threads.readAt, onOpen: fn(), onAllow: fn(), onRefresh: fn(), onMore: fn(), onClearQuery: fn() },
  examples: { Filtered: { messages: threadsFiltered }, NeedsAccess: { messages: threadsNeedAccess }, Failed: { messages: threadsFailed } },
  play: {
    Default: async ({ canvasElement, args }) => {
      const list = within(canvasElement);
      await userEvent.click(list.getByRole("button", { name: /Maya Chen/ }));
      await expect(args.onOpen).toHaveBeenCalledWith("thread:1");
      await expect(list.getByRole("button", { name: /Conversation content unavailable/ })).toBeDisabled();
    },
    Failed: async ({ canvasElement }) => {
      await expect(within(canvasElement).queryByText("No messages")).toBeNull();
    },
  },
};
