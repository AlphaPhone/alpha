import { expect, fn, screen, userEvent, waitFor } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AssistantAttachmentPickerProps } from "./AssistantAttachmentPicker.tsx";

const onOpenChange = fn();

export const meta: ComponentMeta<AssistantAttachmentPickerProps> = {
  args: {
    open: true,
    onOpenChange,
    picker: {
      tab: "photos",
      access: "granted",
      status: "loaded",
      files: [{ id: "p1", name: "IMG_2041.jpg", detail: "3.1 MB", kind: "photo" }, { id: "p2", name: "IMG_2042.jpg", detail: "2.8 MB", kind: "photo" }],
      selected: [],
      room: 4,
      onTabChange: fn(),
      onSelect: fn(),
      onAttach: fn(),
    },
  },
  play: {
    Default: async () => {
      onOpenChange.mockClear();
      const sheet = await screen.findByRole("dialog", { name: "Attach" });
      await expect(sheet).toBeTruthy();
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(onOpenChange.mock.calls).toEqual([[false]]));
    },
  },
};
