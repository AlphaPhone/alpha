import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { SmsReviewCardProps } from "./SmsReviewCard.tsx";

const onSend = fn();
const onDecline = fn();

export const meta: ComponentMeta<SmsReviewCardProps> = {
  args: { to: "2025550142", body: "Alpha QA draft", onSend, onDecline },
  examples: {
    "To a contact": { to: "Maya Chen", number: "+14155550132", body: "Running ten minutes late, sorry." },
    "Long text": { body: "Running about twenty minutes late because the train is stuck outside the station. Start without me and I will catch up on the notes as soon as I sit down." },
    "From a SIM, said in Talk": { note: "SIM 1 · Carrier", hint: "Say “Send this text”", review: "review-1" },
    Deciding: { sendDisabled: true, declineDisabled: true },
    Settled: { onSend: undefined, onDecline: undefined },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onSend.mockClear();
      onDecline.mockClear();
      const card = within(canvasElement);
      await userEvent.click(card.getByRole("button", { name: "Send this text" }));
      await userEvent.click(card.getByRole("button", { name: "Don’t send" }));
      await expect([onSend.mock.calls.length, onDecline.mock.calls.length]).toEqual([1, 1]);
    },
  },
};
