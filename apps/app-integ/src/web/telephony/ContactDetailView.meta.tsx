import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { ContactDetailViewProps } from "./ContactDetailView.tsx";
import { contactConfirming, contactOpen, contactUnsettled } from "./fixtures.ts";

export const meta: ComponentMeta<ContactDetailViewProps> = {
  args: { contacts: contactOpen, onCall: fn(), onMessage: fn(), onEdit: fn(), onDeleteAsked: fn(), onDeleteDeclined: fn(), onDeleteConfirmed: fn() },
  examples: { Confirming: { contacts: contactConfirming }, Unsettled: { contacts: contactUnsettled } },
  play: {
    Default: async ({ canvasElement, args }) => {
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Delete Maya Chen" }));
      await expect(args.onDeleteAsked).toHaveBeenCalled();
      await expect(args.onDeleteConfirmed).not.toHaveBeenCalled();
    },
    Unsettled: async ({ canvasElement }) => {
      const view = within(canvasElement);
      await expect(view.getByRole("button", { name: /Edit/ })).toBeDisabled();
      await expect(view.queryByRole("button", { name: "Delete Maya Chen" })).toBeNull();
    },
  },
};
