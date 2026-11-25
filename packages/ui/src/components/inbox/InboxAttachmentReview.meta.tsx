import { expect, fn, screen, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxAttachmentReviewProps } from "./InboxAttachmentReview.tsx";

const onConfirm = fn();
const onClose = fn();

export const meta: ComponentMeta<InboxAttachmentReviewProps> = {
  args: { open: true, name: "Invoice 2041.pdf", size: "184 KB", handling: "open", outcome: "review", onConfirm, onClose },
  examples: {
    Save: { handling: "save" },
    Working: { handling: "save", outcome: "working" },
    Opened: { outcome: "done" },
    "Reviewed image": {
      name: "Receipt.png", outcome: "done",
      preview: { kind: "image", url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jC0cAAAAASUVORK5CYII=", digest: "e5701bba84550b9c8ff2846fb86b8f60900431456546808fc0d38fc8d9f4c2dc" },
    },
    Saved: { handling: "save", outcome: "done" },
    Refused: { handling: "save", outcome: "refused" },
    "Save not confirmed": { handling: "save", outcome: "unknown" },
    "Access withdrawn": { onConfirm: undefined },
  },
  play: {
    Default: async () => {
      onConfirm.mockClear();
      const sheet = await screen.findByRole("dialog", { name: "Open this file?" });
      await userEvent.click(within(sheet).getByRole("button", { name: "Open" }));
      await expect(onConfirm.mock.calls.length).toBe(1);
    },
    "Reviewed image": async () => {
      const sheet = await screen.findByRole("dialog", { name: "Receipt.png" });
      await expect(within(sheet).getByRole("img", { name: "Receipt.png" })).toBeVisible();
    },
    "Save not confirmed": async () => {
      const sheet = await screen.findByRole("dialog", { name: "Save this file?" });
      await expect(within(sheet).getByRole("alert")).toHaveTextContent("Look in Files");
      await expect(within(sheet).queryByRole("button", { name: "Save" })).toBeNull();
    },
    "Access withdrawn": async () => {
      const sheet = await screen.findByRole("dialog", { name: "Open this file?" });
      await expect(within(sheet).getByRole("button", { name: "Open" })).toBeDisabled();
    },
  },
};
