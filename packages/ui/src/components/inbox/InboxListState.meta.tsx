import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxListStateProps } from "./InboxListState.tsx";

const onAction = fn();

export const meta: ComponentMeta<InboxListStateProps> = {
  args: { kind: "signedOut", onAction },
  examples: {
    Empty: { kind: "empty", onAction: undefined },
    "No matches": { kind: "noResults", onAction: undefined },
    "Not connected": { kind: "notConnected" },
    "Needs access": { kind: "needsAccess" },
    "Spam unavailable": { kind: "unavailable", onAction: undefined },
    Offline: { kind: "offline" },
    Failed: { kind: "failed" },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onAction.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Sign in" }));
      await expect(onAction.mock.calls.length).toBe(1);
    },
    Empty: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button")).toBeNull(),
  },
};
