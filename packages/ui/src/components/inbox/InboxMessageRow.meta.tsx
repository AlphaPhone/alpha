import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { InboxMessageRowProps } from "./InboxMessageRow.tsx";

const onOpen = fn();
const onChosenChange = fn();

export const meta: ComponentMeta<InboxMessageRowProps> = {
  args: { sender: "Ana Lima", subject: "Lunch on Friday?", snippet: "I booked the table by the window for one o'clock", time: "09:41", onOpen, onChosenChange },
  examples: {
    Unread: { unread: true, attachment: true },
    Selecting: { selecting: true },
    Chosen: { selecting: true, chosen: true },
    "Saved list": { onChosenChange: undefined, onSwipe: undefined },
    "Long sender": { sender: "Bruno Costa, Carla Dias and Daniel Esteves", subject: "Re: Re: Fwd: The quarterly planning offsite, travel and the rest of the schedule", unread: true },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onOpen.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: /Lunch on Friday/ }));
      await expect(onOpen.mock.calls.length).toBe(1);
    },
    Selecting: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onOpen.mockClear();
      onChosenChange.mockClear();
      await userEvent.click(within(canvasElement).getByRole("checkbox", { name: /Lunch on Friday/ }));
      await expect([onOpen.mock.calls.length, onChosenChange.mock.calls]).toEqual([0, [[true]]]);
    },
    "Saved list": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("checkbox")).toBeNull(),
  },
};
