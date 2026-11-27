import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxMessageScreenProps } from "./InboxMessageScreen.tsx";

const onClose = fn();
const onShowImages = fn();
const fullDate = "Friday, 14 November 2025 at 09:41:07 GMT";
const none: Partial<InboxMessageScreenProps> = { cc: undefined, replyTo: undefined, onFaultAction: undefined, onShowImages: undefined, onNoticeAction: undefined };
const actions = { onReply: fn(), onReplyAll: fn(), onForward: fn(), onToggleRead: fn(), onArchive: fn(), onTrash: fn(), onAskAlpha: fn() };
const noActions = { onReply: undefined, onReplyAll: undefined, onForward: undefined, onToggleRead: undefined, onArchive: undefined, onTrash: undefined, onAskAlpha: undefined };
const body = (
  <>
    <p>Hi Sam, I booked the table by the window for one o'clock on Friday.</p>
    <p>Bring the invoice if you have it, and let me know about the others.</p>
    <p>Ana</p>
  </>
);

export const meta: ComponentMeta<InboxMessageScreenProps> = {
  args: {
    ...none, ...actions, subject: "Lunch on Friday?", sender: "Ana Lima", address: "ana.lima@example.com", to: "me", date: "09:41", fullDate,
    place: 3, count: 3, onOlder: fn(), onNewer: undefined, onClose, unread: false, reading: false, fromPhone: false, imagesHidden: false, children: body, attachments: [],
  },
  examples: {
    "Earlier in the thread": { place: 2, onNewer: fn() },
    "With conversation previews": { onOlder: undefined, threadRows: [{ position: 0, sender: "Sam Rivera", date: "Oct 31", snippet: "Is a window table available?", onOpen: fn() }] },
    "Images hidden": { imagesHidden: true, onShowImages },
    "With attachments": { attachments: [{ id: "1", name: "Invoice 2041.pdf", size: "184 KB", onOpen: fn(), onSave: fn() }, { id: "2", name: "Menu.png", size: "2.1 MB", onOpen: fn(), onSave: undefined, saveUnconfirmed: true }] },
    "Copied with Reply-To": { cc: "Bruno Costa", replyTo: "events@example.com" },
    Unread: { unread: true },
    Loading: { reading: true, children: undefined },
    "Could not be read": { fault: "unreachable", onFaultAction: fn(), children: undefined },
    "Too large": { fault: "tooLarge", onFaultAction: fn(), children: undefined },
    "Saved copy": { fromPhone: true, ...noActions, onOlder: undefined, attachments: [] },
    "Marking unconfirmed": { notice: "markUnconfirmed", onNoticeAction: fn() },
    "Read only account": { ...noActions, onAskAlpha: fn() },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onClose.mockClear();
      const canvas = within(canvasElement);
      await expect(canvas.getAllByRole("heading").length).toBe(1);
      const summary = canvas.getByText("To me · 09:41").closest("summary")!;
      const details = summary.closest("details")!;
      const date = canvas.getByText(fullDate);
      await expect(details.open).toBe(false);
      await waitFor(() => expect(summary).toBeVisible());
      await userEvent.click(summary);
      await expect(details.open).toBe(true);
      await waitFor(() => expect(date).toBeVisible());
      await userEvent.click(canvas.getByRole("button", { name: "Back to the list" }));
      await expect(onClose.mock.calls.length).toBe(1);
    },
    "Images hidden": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onShowImages.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Show images" }));
      await expect(onShowImages.mock.calls.length).toBe(1);
    },
    "Saved copy": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      await expect(within(canvasElement).queryByRole("button", { name: "Show images" })).toBeNull();
    },
  },
};
