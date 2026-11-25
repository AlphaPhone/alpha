import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { AssistantGrabber } from "./AssistantGrabber.tsx";
import type { AssistantChatHeaderProps } from "./AssistantChatHeader.tsx";

const onHome = fn();
const onResize = fn();
const onClose = fn();

export const meta: ComponentMeta<AssistantChatHeaderProps> = {
  args: { title: "Friday plans", context: { view: "Calendar", day: "Thu 10 Jul" }, grabber: <AssistantGrabber />, onHome, onResize, onClose },
  examples: {
    Full: { expanded: true, grabber: undefined },
    Sensitive: { context: { view: "Passwords", sensitive: true } },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      for (const spy of [onHome, onResize, onClose]) spy.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Go Home" }));
      await userEvent.click(canvas.getByRole("button", { name: "Expand chat" }));
      await userEvent.click(canvas.getByRole("button", { name: "Minimize chat" }));
      await expect([onHome.mock.calls.length, onResize.mock.calls.length, onClose.mock.calls.length]).toEqual([1, 1, 1]);
    },
    Full: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      await expect([canvas.queryByRole("button", { name: "Resize chat" }), canvas.getByRole("button", { name: "Shrink chat" })]).toEqual([null, expect.anything()]);
    },
  },
};
