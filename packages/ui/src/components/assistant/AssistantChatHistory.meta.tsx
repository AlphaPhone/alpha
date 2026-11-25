import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AssistantChatHistoryProps } from "./AssistantChatHistory.tsx";
import { refuses } from "./plays.ts";

const onChoose = fn();
const onBack = fn();

export const meta: ComponentMeta<AssistantChatHistoryProps> = {
  args: {
    chats: [
      { id: "4", title: "Friday plans", detail: "Today", current: true },
      { id: "3", title: "Dentist and invoices", detail: "Yesterday" },
      { id: "2", title: "Gift ideas for Mum", detail: "Tuesday" },
    ],
    onChoose,
    onBack,
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
      onBack.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: /Dentist and invoices/ }));
      await userEvent.click(canvas.getByRole("button", { name: "Back to chat" }));
      await expect([onChoose.mock.calls, onBack.mock.calls.length]).toEqual([[["3"]], 1]);
    },
    Blocked: refuses(/Dentist and invoices/, onChoose),
  },
};
