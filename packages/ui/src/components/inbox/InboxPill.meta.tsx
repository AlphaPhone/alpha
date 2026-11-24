import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxPillProps } from "./InboxPill.tsx";

const onRemove = fn();

export const meta: ComponentMeta<InboxPillProps> = {
  args: { label: "ana.lima@example.com", invalid: false, onRemove },
  examples: {
    Attachment: { label: "Invoice 2041.pdf" },
    "Not accepted": { label: "ana.lima@", invalid: true },
    "Cannot remove": { onRemove: undefined },
    "Long address": { label: "a-very-long-address-for-someone-on-a-long-domain@department.of.long.names.example.com" },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onRemove.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Remove ana.lima@example.com" }));
      await expect(onRemove.mock.calls.length).toBe(1);
    },
  },
};
