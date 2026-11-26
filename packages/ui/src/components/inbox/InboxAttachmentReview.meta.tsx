import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxAttachmentReviewProps } from "./InboxAttachmentReview.tsx";

const onConfirm = fn();
const onSave = fn();
const onClose = fn();
const onNext = fn();
const raster = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAAH0lEQVR4nGMwTz1AFcQwatCoQaMGjRo0atCoQQNvEADDgg8uFeV++AAAAABJRU5ErkJggg==";
const digest = "48413e11daa0a33f83d16530aad6d1fb7fd41fe2f3c61f2588f4962191db77e8";

export const meta: ComponentMeta<InboxAttachmentReviewProps> = {
  args: { open: true, name: "Invoice 2041.pdf", size: "184 KB", handling: "open", outcome: "review", onConfirm, onClose },
  examples: {
    Save: { handling: "save" },
    Working: { handling: "save", outcome: "working" },
    Opened: { outcome: "done" },
    "Save while reviewing": { onSave },
    "Saved after opening": { name: "Receipt.png", outcome: "done", preview: { kind: "image", url: raster, digest }, saveOutcome: "done" },
    "Reviewed image": {
      name: "Receipt.png", outcome: "done",
      preview: { kind: "image", url: raster, digest },
    },
    "PDF with more pages": { outcome: "done", preview: { kind: "pdf", digest, page: 1, pages: 2, drawing: { kind: "rendered", url: raster }, onNext } },
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
    "Save while reviewing": async () => {
      onSave.mockClear();
      const sheet = within(await screen.findByRole("dialog", { name: "Open this file?" }));
      await userEvent.click(sheet.getByRole("button", { name: "Save" }));
      await expect(onSave.mock.calls.length).toBe(1);
      await expect(sheet.getByRole("button", { name: "Open" })).toBeEnabled();
    },
    "Saved after opening": async () => {
      const sheet = within(await screen.findByRole("dialog", { name: "Receipt.png" }));
      await expect(sheet.getByRole("status")).toHaveTextContent("Saved to Files");
      await expect(sheet.queryByRole("button", { name: "Save" })).toBeNull();
    },
    "Reviewed image": async () => {
      const sheet = await screen.findByRole("dialog", { name: "Receipt.png" });
      const preview = within(sheet).getByRole("img", { name: "Receipt.png" });
      if (!(preview instanceof HTMLImageElement)) throw new Error("Expected a rendered attachment image");
      await preview.decode();
      await waitFor(() => expect(preview).toBeVisible());
    },
    "PDF with more pages": async () => {
      onNext.mockClear();
      const sheet = within(await screen.findByRole("dialog", { name: "Invoice 2041.pdf" }));
      await expect(sheet.getByRole("button", { name: "Previous page" })).toBeDisabled();
      await userEvent.click(sheet.getByRole("button", { name: "Next page" }));
      await expect(onNext.mock.calls.length).toBe(1);
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
