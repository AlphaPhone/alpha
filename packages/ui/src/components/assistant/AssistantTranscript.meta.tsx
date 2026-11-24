import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { AssistantCard } from "./AssistantCard.tsx";
import type { AssistantTranscriptProps } from "./AssistantTranscript.tsx";

const onRetry = fn();
const onReturnToOriginal = fn();

export const meta: ComponentMeta<AssistantTranscriptProps> = {
  args: {
    messages: [
      { id: "1", author: "owner", text: "What is on my calendar on Friday?" },
      {
        id: "2",
        author: "alpha",
        text: "Lunch with Ana at 12:30, and the dentist at 16:00.",
        children: <AssistantCard card={{ kind: "agenda", title: "Friday", rows: [{ id: "1", time: "12:30", title: "Lunch with Ana" }, { id: "2", time: "16:00", title: "Dentist" }] }} onOpen={fn()} />,
      },
      { id: "3", author: "owner", text: "Move the dentist to Tuesday." },
    ],
    onRetry: undefined,
    onEarlier: undefined,
    onLater: undefined,
    onReturnToOriginal: undefined,
  },
  examples: {
    Replying: { turn: { status: "replying" } },
    "May not have arrived": { turn: { status: "unknown", onCheck: fn() } },
    Fork: { onReturnToOriginal },
    "Around a message": { onEarlier: fn(), onLater: fn() },
    Failed: { messages: [], status: "failed", onRetry },
    Empty: { messages: [] },
  },
  play: {
    Failed: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onRetry.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Try again" }));
      await expect(onRetry.mock.calls.length).toBe(1);
    },
    Fork: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onReturnToOriginal.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Original chat" }));
      await expect(onReturnToOriginal.mock.calls.length).toBe(1);
    },
  },
};
