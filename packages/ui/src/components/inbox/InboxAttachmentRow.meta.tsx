import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxAttachmentRowProps } from "./InboxAttachmentRow.tsx";

const onOpen = fn();
const onSave = fn();

export const meta: ComponentMeta<InboxAttachmentRowProps> = {
  args: { name: "Invoice 2041.pdf", size: "184 KB", onOpen, onSave, saveUnconfirmed: false },
  examples: {
    "Save not confirmed": { saveUnconfirmed: true },
    "Saved copy of the message": { onOpen: undefined, onSave: undefined },
    "Long name": { name: "Scan of the signed rental agreement for the flat on Rua das Flores, final version 3.pdf", size: "12.4 MB" },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onOpen.mockClear();
      onSave.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Open Invoice 2041.pdf" }));
      await userEvent.click(canvas.getByRole("button", { name: "Save Invoice 2041.pdf" }));
      await expect([onOpen.mock.calls.length, onSave.mock.calls.length]).toEqual([1, 1]);
    },
    "Save not confirmed": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button", { name: /^Save/ })).toBeNull(),
  },
};
