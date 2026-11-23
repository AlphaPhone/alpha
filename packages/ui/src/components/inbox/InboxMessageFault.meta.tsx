import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxMessageFaultProps } from "./InboxMessageFault.tsx";

const onAction = fn();

export const meta: ComponentMeta<InboxMessageFaultProps> = {
  args: { kind: "unreachable", onAction },
  examples: { Changed: { kind: "changed" }, "Conversation changed": { kind: "conversationChanged" }, "Too large": { kind: "tooLarge" } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onAction.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Try again" }));
      await expect(onAction.mock.calls.length).toBe(1);
    },
    "Too large": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("button", { name: "Open in Gmail" })).toBeInTheDocument(),
  },
};
