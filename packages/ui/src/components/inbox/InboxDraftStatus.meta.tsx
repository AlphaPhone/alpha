import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxDraftStatusProps } from "./InboxDraftStatus.tsx";

const onRetry = fn();

export const meta: ComponentMeta<InboxDraftStatusProps> = {
  args: { keeping: "kept", gmail: "none", sent: "none", onRetry },
  examples: {
    Keeping: { keeping: "writing" },
    "Not kept": { keeping: "notKept" },
    "Storage full": { keeping: "full" },
    "Saved to Gmail": { gmail: "saved" },
    "Saving to Gmail": { gmail: "saving", keeping: "writing" },
    "Changed in Gmail": { gmail: "clash" },
    "Unsure of the copy": { gmail: "unsure" },
    "Already sent": { sent: "already" },
    "Earlier version sent": { sent: "earlier", gmail: "unsaved" },
    "May have been sent": { sent: "maybe" },
  },
  play: {
    "Not kept": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onRetry.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Retry" }));
      await expect(onRetry.mock.calls.length).toBe(1);
    },
    Default: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button")).toBeNull(),
  },
};
