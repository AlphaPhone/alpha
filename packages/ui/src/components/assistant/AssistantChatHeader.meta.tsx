import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { AssistantGrabber } from "./AssistantGrabber.tsx";
import type { AssistantChatHeaderProps } from "./AssistantChatHeader.tsx";
import { refuses } from "./plays.ts";

const onNew = fn();
const onHistory = fn();

export const meta: ComponentMeta<AssistantChatHeaderProps> = {
  args: { title: "Friday plans", context: { view: "Calendar", day: "Thu 10 Jul" }, grabber: <AssistantGrabber />, onHistory, onSearch: fn(), onNew, onClose: fn() },
  examples: {
    "Long title": { title: "Where to eat near the office on a rainy Friday with a large group" },
    "New not offered": { onNew: undefined },
    Sensitive: { context: { view: "Passwords", sensitive: true } },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onNew.mockClear();
      onHistory.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "New chat" }));
      await userEvent.click(canvas.getByRole("button", { name: "Chats, Friday plans" }));
      await expect([onNew.mock.calls.length, onHistory.mock.calls.length]).toEqual([1, 1]);
    },
    Making: refuses("New chat", onNew),
  },
};
