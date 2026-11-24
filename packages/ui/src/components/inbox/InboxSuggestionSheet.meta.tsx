import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxSuggestionSheetProps } from "./InboxSuggestionSheet.tsx";

const onAdd = fn();
const onReplace = fn();
const onDismiss = fn();

export const meta: ComponentMeta<InboxSuggestionSheetProps> = {
  args: {
    open: true, from: "alpha", source: undefined, target: "draft", tooLong: false, onAdd, onReplace, onDismiss,
    text: "Thanks Ana, Friday at one works for me. I will bring the invoice and the signed form.\n\nSam",
  },
  examples: {
    "Text from Notes": { from: "owner", source: "Notes", text: "Agenda for Friday: lunch, the invoice, the offsite dates." },
    "New reply": { from: "owner", source: "Notes", target: "newReply", onReplace: undefined },
    "New email": { from: "owner", source: "Notes", target: "newEmail", onReplace: undefined },
    "Too long": { tooLong: true, onAdd: undefined, onReplace: undefined },
  },
  play: {
    Default: async () => {
      onAdd.mockClear();
      onReplace.mockClear();
      onDismiss.mockClear();
      const sheet = await screen.findByRole("dialog", { name: "Review email suggestion" });
      await userEvent.click(within(sheet).getByRole("button", { name: "Replace" }));
      await userEvent.click(within(sheet).getByRole("button", { name: "Add" }));
      await expect([onReplace.mock.calls.length, onAdd.mock.calls.length]).toEqual([1, 1]);
      await userEvent.click(within(sheet).getByRole("button", { name: "Dismiss" }));
      await waitFor(() => expect(onDismiss.mock.calls.length).toBe(1));
    },
    "Too long": async () => {
      const sheet = await screen.findByRole("dialog", { name: "Review email suggestion" });
      await expect(within(sheet).queryByRole("button", { name: "Add" })).toBeNull();
    },
  },
};
