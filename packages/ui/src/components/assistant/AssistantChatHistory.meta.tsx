import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AssistantChatHistoryProps } from "./AssistantChatHistory.tsx";
import { refuses } from "./plays.ts";

const onChoose = fn();
const onStart = fn();

export const meta: ComponentMeta<AssistantChatHistoryProps> = {
  args: {
    chats: [
      { id: "4", title: "Friday plans", detail: "Today", current: true },
      { id: "3", title: "Dentist and invoices", detail: "Yesterday" },
      { id: "2", title: "Gift ideas for Mum", detail: "Tuesday" },
    ],
    onChoose,
    onStart,
    onRetry: fn(),
  },
  examples: {
    Loading: { chats: [], status: "loading" },
    Empty: { chats: [] },
    "Failed, with the list kept": { status: "failed" },
    "Unsure whether the last was made": { unsure: true },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onChoose.mockClear();
      onStart.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: /Dentist and invoices/ }));
      await userEvent.click(canvas.getByRole("button", { name: "New chat" }));
      await expect([onChoose.mock.calls, onStart.mock.calls.length]).toEqual([[["3"]], 1]);
    },
    Blocked: refuses(/Dentist and invoices/, onChoose),
    Making: refuses("New chat", onStart),
  },
};
