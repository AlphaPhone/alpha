import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AssistantAttachmentChipProps } from "./AssistantAttachmentChip.tsx";

const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkmP+/HgAEtAI1xQ0x2QAAAABJRU5ErkJggg==";
const onRemove = fn();
const onPreview = fn();

export const meta: ComponentMeta<AssistantAttachmentChipProps> = {
  args: { attachment: { id: "1", kind: "file", name: "Lease agreement.pdf" }, onRemove, onPreview: undefined },
  examples: {
    Image: { attachment: { id: "2", kind: "image", name: "IMG_2041.jpg", src: pixel }, onPreview },
    Mail: { attachment: { id: "3", kind: "mail", name: "Invoice from Bruno" } },
    Transcript: { attachment: { id: "4", kind: "transcript", name: "Call with Carla, 4 min" } },
    "Sent file": { onRemove: undefined },
    "Long name": { attachment: { id: "5", kind: "file", name: "Quarterly statement of account for the flat in Alfama, final version.pdf" } },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onRemove.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Remove Lease agreement.pdf" }));
      await expect(onRemove.mock.calls.length).toBe(1);
    },
    Image: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onPreview.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Preview IMG_2041.jpg" }));
      await expect(onPreview.mock.calls.length).toBe(1);
    },
  },
};
