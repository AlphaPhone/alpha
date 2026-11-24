import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AddToHomeSheetProps } from "./AddToHomeSheet.tsx";
import { hiddenApps } from "./HomeTileGrid.meta.tsx";

const onAdd = fn();
const onClose = fn();

export const meta: ComponentMeta<AddToHomeSheetProps> = {
  args: { open: true, apps: hiddenApps, onAdd, onClose },
  examples: { Saving: { onAdd: undefined } },
  play: {
    Default: async () => {
      onAdd.mockClear();
      onClose.mockClear();
      const sheet = await screen.findByRole("dialog", { name: "Add to Home" });
      await userEvent.click(within(sheet).getByRole("button", { name: "Files" }));
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect([onAdd.mock.calls, onClose.mock.calls.length]).toEqual([[["Files"]], 1]));
    },
    Saving: async () => {
      const sheet = await screen.findByRole("dialog", { name: "Add to Home" });
      await expect(within(sheet).getByRole("button", { name: "Notes" })).toBeDisabled();
    },
  },
};
