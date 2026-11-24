import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { EmailCardViewProps } from "./EmailCardView.tsx";
import { emailDraft, emailSent, emailUncertain } from "./fixtures.ts";

export const meta: ComponentMeta<EmailCardViewProps> = {
  args: { card: emailDraft, to: "ann@example.com", subject: "Lunch", body: "Noon at the usual place?", onEdit: fn(), onSend: fn(), onDecline: fn() },
  examples: {
    Sent: { card: emailSent },
    Uncertain: { card: emailUncertain },
    NoRecipient: { to: "" },
    ToMyself: { to: "me", ownAddress: "owner@example.com" },
  },
  play: {
    Default: async ({ args, canvasElement }: { args: EmailCardViewProps; canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      await expect(canvas.getByText(/1 recipient: ann@example.com/)).toBeTruthy();
      await userEvent.click(canvas.getByRole("button", { name: /Send/ }));
      await expect(args.onSend).toHaveBeenCalledTimes(1);
    },
    Uncertain: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button", { name: /Send/ })).toBeNull(),
    NoRecipient: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("button", { name: /Send/ })).toBeDisabled(),
    ToMyself: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByDisplayValue("owner@example.com")).toBeTruthy(),
  },
};
