import { expect, fn, screen, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { ConfirmDialogProps } from "./ConfirmDialog.tsx";

const onConfirm = fn();
const onCancel = fn();

export const meta: ComponentMeta<ConfirmDialogProps> = {
  args: { open: true, title: "Delete this note?", children: "It is deleted from every device.", confirmLabel: "Delete", destructive: true, onConfirm, onCancel },
  play: {
    Default: async () => {
      onConfirm.mockClear();
      onCancel.mockClear();
      const dialog = await screen.findByRole("alertdialog", { name: "Delete this note?" });
      await expect(dialog).toHaveAccessibleDescription("It is deleted from every device.");
      await expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Cancel" }));
      await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));
      await expect([onConfirm.mock.calls.length, onCancel.mock.calls.length]).toEqual([1, 0]);
      await userEvent.click(dialog.previousElementSibling!);
      await expect(onCancel.mock.calls.length).toBe(0);
      await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
      await userEvent.keyboard("{Escape}");
      await expect([onConfirm.mock.calls.length, onCancel.mock.calls.length]).toEqual([1, 2]);
    },
    Loading: async () => {
      onConfirm.mockClear();
      onCancel.mockClear();
      const dialog = await screen.findByRole("alertdialog", { name: "Delete this note?" });
      const confirm = within(dialog).getByRole("button", { name: "Delete" });
      await expect([confirm.getAttribute("aria-busy"), confirm.getAttribute("aria-disabled")]).toEqual(["true", "true"]);
      await userEvent.click(confirm, { pointerEventsCheck: 0 });
      await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }), { pointerEventsCheck: 0 });
      await userEvent.keyboard("{Escape}");
      await expect([onConfirm.mock.calls.length, onCancel.mock.calls.length]).toEqual([0, 0]);
    },
    Open: () => expect(screen.queryByRole("alertdialog")).toBeNull(),
  },
};
