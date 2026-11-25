import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { AssistantCard } from "./AssistantCard.tsx";
import type { AssistantMessageProps } from "./AssistantMessage.tsx";

const onQuote = fn();
const onEditAgain = fn();
const onFork = fn();
const onReadAloud = fn();

export const meta: ComponentMeta<AssistantMessageProps> = {
  args: {
    author: "alpha",
    text: "Friday works. Lunch with Ana is at 12:30, at Cais do Sodré.",
    onPreview: undefined,
    onQuote: undefined,
    onCopy: undefined,
    onUseInEmail: undefined,
    onEditAgain: undefined,
    onFork: undefined,
    onReadAloud: undefined,
  },
  examples: {
    "Owner": { author: "owner", text: "What is on Friday?" },
    "Owner with files": {
      author: "owner",
      text: "Can you summarise these?",
      attachments: [{ id: "1", kind: "file", name: "Lease.pdf" }, { id: "2", kind: "mail", name: "Invoice from Bruno" }],
    },
    Quote: { author: "owner", text: "And the one before?", quote: "Friday works. Lunch with Ana is at 12:30." },
    "With a card": {
      children: <AssistantCard card={{ kind: "event", title: "Lunch with Ana", time: "Friday, 12:30 to 13:30" }} onOpen={fn()} />,
    },
    "Alpha actions": { onQuote, onFork, onReadAloud },
    "Owner actions": { author: "owner", text: "What is on Friday?", onQuote, onEditAgain },
  },
  play: {
    "Alpha actions": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onReadAloud.mockClear();
      onFork.mockClear();
      const trigger = within(canvasElement).getByRole("button", { name: /Friday works/ });
      await userEvent.click(trigger);
      await expect(screen.queryByRole("menuitem", { name: "Edit and resend" })).toBeNull();
      await userEvent.click(await screen.findByRole("menuitem", { name: "Read aloud" }));
      await waitFor(() => expect([onReadAloud.mock.calls.length, screen.queryByRole("menu"), document.activeElement]).toEqual([1, null, trigger]));
      await expect(onFork.mock.calls.length).toBe(0);
    },
    "Owner actions": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onEditAgain.mockClear();
      const trigger = within(canvasElement).getByRole("button", { name: /What is on Friday/ });
      await userEvent.click(trigger);
      await expect(screen.queryByRole("menuitem", { name: "Read aloud" })).toBeNull();
      await userEvent.click(await screen.findByRole("menuitem", { name: "Edit and resend" }));
      await waitFor(() => expect([onEditAgain.mock.calls.length, screen.queryByRole("menu"), document.activeElement]).toEqual([1, null, trigger]));
    },
  },
};
