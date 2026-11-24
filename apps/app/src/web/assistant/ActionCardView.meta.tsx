import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { ActionCardViewProps } from "./ActionCardView.tsx";
import { closeTabsCard, doneCard, expiredCard, liveCard, notesCard, textCard } from "./fixtures.ts";

export const meta: ComponentMeta<ActionCardViewProps> = {
  args: { card: liveCard, emergency: false, busy: false, now: Date.UTC(2030, 0, 1, 12, 0), onApprove: fn(), onDecline: fn() },
  examples: {
    Done: { card: doneCard },
    Expired: { card: expiredCard },
    Emergency: { emergency: true },
    CloseAllTabs: { card: closeTabsCard },
    WithDestination: { card: notesCard, onOpen: fn() },
    Text: { card: textCard },
  },
  play: {
    Emergency: async ({ args, canvasElement }: { args: ActionCardViewProps; canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      await expect(canvas.getByRole("button", { name: "Not during an emergency call." })).toBeDisabled();
      await userEvent.click(canvas.getByRole("button", { name: /Decline/ }));
      await expect(args.onDecline).toHaveBeenCalled();
    },
    CloseAllTabs: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("list", { name: "What Close all tabs acts on" })).toHaveTextContent("1 private tab"),
    WithDestination: async ({ args, canvasElement }: { args: ActionCardViewProps; canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Open what Create note is about" }));
      await expect(args.onOpen).toHaveBeenCalled();
      await userEvent.click(canvas.getByRole("button", { name: "Approve Create note" }));
      await expect(args.onApprove).toHaveBeenCalled();
    },
    Text: async ({ args, canvasElement }: { args: ActionCardViewProps; canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      await expect(canvas.queryByText("Say “Send this text” to send it.")).toBeNull();
      await userEvent.click(canvas.getByRole("button", { name: "Send this text" }));
      await expect(args.onApprove).toHaveBeenCalled();
    },
    Expired: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button", { name: /Approve/ })).toBeNull(),
  },
};
