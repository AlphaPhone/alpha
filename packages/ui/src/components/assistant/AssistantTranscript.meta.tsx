import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { AssistantCard } from "./AssistantCard.tsx";
import type { AssistantTranscriptProps } from "./AssistantTranscript.tsx";

const onRetry = fn();
const long = Array.from({ length: 12 }, (_, at) => ({ id: `long-${at}`, author: at % 2 === 0 ? "owner" as const : "alpha" as const, text: `Message ${at + 1}: what was said, long enough to wrap onto a second line in a narrow sheet.` }));
/** The scroll of the log, `below` how far its end is out of view. */
const scrollOf = (log: HTMLElement) => ({ top: log.scrollTop, below: log.scrollHeight - log.scrollTop - log.clientHeight });
/** More text arriving at the end of the log, as a reply growing does. */
const arrive = (log: HTMLElement) => log.firstElementChild?.append(Object.assign(document.createElement("div"), { style: "height: 300px; flex-shrink: 0" }));
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
    "Following the end": { messages: long },
  },
  play: {
    // spec/app/assistant/chats.md, "The conversation keeps its newest message in view until the owner scrolls up from it"
    "Following the end": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const log = within(canvasElement).getByRole("log");
      log.style.height = "160px";
      await waitFor(() => expect(scrollOf(log).below).toBeLessThan(2));
      arrive(log);
      log.dispatchEvent(new Event("scroll"));
      await waitFor(() => expect(scrollOf(log).below).toBeLessThan(2));
      log.scrollTop -= 200;
      await waitFor(() => expect(scrollOf(log).below).toBeGreaterThan(150));
      const reading = scrollOf(log).top;
      arrive(log);
      await waitFor(() => expect(scrollOf(log).below).toBeGreaterThan(400));
      await expect(scrollOf(log).top).toBe(reading);
      log.scrollTop = log.scrollHeight;
      await waitFor(() => expect(scrollOf(log).below).toBeLessThan(2));
      arrive(log);
      await waitFor(() => expect(scrollOf(log).below).toBeLessThan(2));
    },
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
