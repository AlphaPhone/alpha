import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AssistantPendingAttachmentsProps } from "./AssistantPendingAttachments.tsx";
import { offersNothing } from "./plays.ts";

const onRemove = fn();

export const meta: ComponentMeta<AssistantPendingAttachmentsProps> = {
  args: {
    limit: 4,
    onRemove,
    attachments: [
      { id: "1", kind: "mail", name: "Invoice from Bruno" },
      { id: "2", kind: "file", name: "Statement.pdf" },
    ],
  },
  examples: {
    Full: {
      attachments: [
        { id: "1", kind: "file", name: "Statement.pdf" },
        { id: "2", kind: "file", name: "Lease.pdf" },
        { id: "3", kind: "file", name: "Receipt.pdf" },
        { id: "4", kind: "file", name: "Photo of the meter.jpg" },
      ],
    },
    "Send in hand": { onRemove: undefined },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onRemove.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Remove Statement.pdf" }));
      await expect(onRemove.mock.calls).toEqual([["2"]]);
    },
    "Send in hand": offersNothing,
  },
};
