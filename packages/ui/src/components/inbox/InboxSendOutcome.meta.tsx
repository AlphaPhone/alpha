import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxSendOutcomeProps } from "./InboxSendOutcome.tsx";

const onCheckSent = fn();
const onSendAgain = fn();
const onDismiss = fn();
const none = { onCheckSent: undefined, onSendAgain: undefined, onDismiss: undefined };

export const meta: ComponentMeta<InboxSendOutcomeProps> = {
  args: { outcome: "unknown", checking: false, onCheckSent, onSendAgain, onDismiss },
  examples: {
    Sending: { outcome: "sending", ...none },
    Sent: { outcome: "sent", onCheckSent: undefined, onSendAgain: undefined },
    Refused: { outcome: "refused", onCheckSent: undefined },
    Stopped: { outcome: "stopped", onCheckSent: undefined, onSendAgain: undefined },
    Checking: { checking: true },
    "Found in Sent": { outcome: "foundSent", onCheckSent: undefined, onSendAgain: undefined },
    "Not found in Sent": { outcome: "notSent", onCheckSent: undefined },
    "Already checked": { onCheckSent: undefined },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onCheckSent.mockClear();
      onSendAgain.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Check Sent" }));
      await userEvent.click(canvas.getByRole("button", { name: "Send again" }));
      await expect([onCheckSent.mock.calls.length, onSendAgain.mock.calls.length]).toEqual([1, 1]);
    },
    "Already checked": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button", { name: "Check Sent" })).toBeNull(),
  },
};
