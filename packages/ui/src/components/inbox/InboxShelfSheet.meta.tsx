import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxShelfSheetProps } from "./InboxShelfSheet.tsx";

const onResume = fn();
const onOpenChange = fn();

export const meta: ComponentMeta<InboxShelfSheetProps> = {
  args: {
    open: true,
    drafts: [
      { id: "1", to: "ana.lima@example.com", subject: "Lunch on Friday?" },
      { id: "2", to: "No recipient", subject: "Notes for the offsite" },
      { id: "3", to: "bruno@costa.example", subject: "Invoice 2041", state: "sent" },
    ],
    onResume,
    onOpenChange,
  },
  examples: { "A draft is open": { onResume: undefined } },
  play: {
    Default: async () => {
      onResume.mockClear();
      onOpenChange.mockClear();
      const sheet = await screen.findByRole("dialog", { name: "Set aside" });
      await userEvent.click(within(sheet).getByRole("button", { name: /Notes for the offsite/ }));
      await waitFor(() => expect([onResume.mock.calls, onOpenChange.mock.calls]).toEqual([[["2"]], [[false]]]));
    },
  },
};
