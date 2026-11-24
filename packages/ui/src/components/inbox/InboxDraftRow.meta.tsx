import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxDraftRowProps } from "./InboxDraftRow.tsx";

const onResume = fn();

export const meta: ComponentMeta<InboxDraftRowProps> = {
  args: { to: "ana.lima@example.com", subject: "Lunch on Friday?", state: "plain", onResume },
  examples: {
    Sent: { state: "sent" },
    "Earlier version sent": { state: "earlierSent" },
    "Being sent": { state: "sending" },
    "Unsure of Gmail's copy": { state: "unsure" },
    "Changed in Gmail": { state: "clash" },
    "No recipient": { to: "No recipient", subject: "Notes for the offsite" },
    "A draft is open": { onResume: undefined },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onResume.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: /Lunch on Friday/ }));
      await expect(onResume.mock.calls.length).toBe(1);
    },
    "A draft is open": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button")).toBeNull(),
  },
};
