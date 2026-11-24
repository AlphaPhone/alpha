import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxNoticeProps } from "./InboxNotice.tsx";

const onAction = fn();
const onDismiss = fn();

export const meta: ComponentMeta<InboxNoticeProps> = {
  args: { kind: "savedList", onAction, onDismiss: undefined },
  examples: {
    "Out of date": { kind: "listOutOfDate" },
    Reconnect: { kind: "reconnect" },
    "Sending off": { kind: "sendingOff" },
    "Not editable": { kind: "notEditable" },
    Dismissable: { kind: "markUnconfirmed", onDismiss },
    "Select again": { kind: "selectAgain", onAction: undefined },
    "File too big": { kind: "fileTooBig", onAction: undefined, onDismiss },
    "Contacts in Settings": { kind: "contactsInSettings" },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onAction.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Refresh" }));
      await expect(onAction.mock.calls.length).toBe(1);
    },
    "Select again": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button")).toBeNull(),
    Dismissable: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onDismiss.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Dismiss" }));
      await expect(onDismiss.mock.calls.length).toBe(1);
    },
  },
};
