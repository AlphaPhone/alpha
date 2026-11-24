import { expect, fn, screen, userEvent, waitFor } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AssistantPhotoPreviewProps } from "./AssistantPhotoPreview.tsx";

const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkmP+/HgAEtAI1xQ0x2QAAAABJRU5ErkJggg==";
const onOpenChange = fn();

export const meta: ComponentMeta<AssistantPhotoPreviewProps> = {
  args: { open: true, onOpenChange, src: pixel, name: "IMG_2041.jpg" },
  play: {
    Default: async () => {
      onOpenChange.mockClear();
      const dialog = await screen.findByRole("dialog", { name: "IMG_2041.jpg" });
      await expect(dialog).toBeTruthy();
      await userEvent.click(await screen.findByRole("button", { name: "Close" }));
      await waitFor(() => expect(onOpenChange.mock.calls).toEqual([[false]]));
    },
  },
};
