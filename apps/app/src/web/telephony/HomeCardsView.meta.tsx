import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { attention } from "./fixtures.ts";
import type { HomeCardsViewProps } from "./HomeCardsView.tsx";

export const meta: ComponentMeta<HomeCardsViewProps> = {
  args: { attention, open: fn() },
  examples: {
    Unread: { attention: { ...attention, missed: [] } },
    Unread2: { attention: { ...attention, missed: [], unread: [...attention.unread, { threadId: "thread:2", title: "Sam", snippet: "Lunch?", date: attention.readAt - 30_000 }] } },
    NotRead: { attention: { ...attention, threadsRead: false, callsRead: false, voicemailRead: false } },
  },
  play: {
    Default: async ({ canvasElement, args }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: /Open Messages/ }));
      await expect(args.open).toHaveBeenCalledWith("messages", "thread:thread:1");
    },
    NotRead: async ({ canvasElement }) => {
      await expect(within(canvasElement).queryByRole("button")).toBeNull();
    },
  },
};
