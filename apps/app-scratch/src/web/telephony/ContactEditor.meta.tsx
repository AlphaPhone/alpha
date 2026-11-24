import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { ContactEditorProps } from "./ContactEditor.tsx";
import { contactDetail, creating, editing, editingStale } from "./fixtures.ts";

export const meta: ComponentMeta<ContactEditorProps> = {
  args: { editor: editing, detail: contactDetail, saving: false, onEdited: fn(), onSave: fn(), onCancel: fn() },
  examples: { Creating: { editor: creating, detail: { tag: "NoDetail" } }, Stale: { editor: editingStale }, Saving: { saving: true } },
  play: {
    Default: async ({ canvasElement, args }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: /Cancel/ }));
      await expect(args.onCancel).toHaveBeenCalled();
      await expect(args.onSave).not.toHaveBeenCalled();
    },
  },
};
