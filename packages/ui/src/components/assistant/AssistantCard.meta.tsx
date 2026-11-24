import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AssistantCardProps } from "./AssistantCard.tsx";
import { offersNothing, presses } from "./plays.ts";

const onOpen = fn();
const onChoose = fn();
const onSave = fn();
const onHandOn = fn();

export const meta: ComponentMeta<AssistantCardProps> = {
  args: { card: { kind: "event", title: "Lunch with Ana", time: "Friday, 12:30 to 13:30" }, onOpen },
  examples: {
    Agenda: { card: { kind: "agenda", title: "Today", rows: [{ id: "1", time: "09:30", title: "Stand-up" }, { id: "2", time: "12:30", title: "Lunch with Ana" }] } },
    Notice: { card: { kind: "notice", title: "Alpha is off until you pick a plan" }, onOpen: undefined },
    Proposal: { card: { kind: "decision", variant: "proposal", title: "Move the dentist to Tuesday", detail: "Tuesday, 16:00", action: "Approve" }, onHandOn, onOpen: undefined },
    Summary: { card: { kind: "summary", title: "Your week", bullets: ["Three meetings moved", "Invoice due Friday"] }, onSave, onOpen: undefined },
    Choices: { card: { kind: "choices", title: "Share your location?", options: ["Share once", "Not now"] }, onChoose, onOpen: undefined },
    Plain: { card: { kind: "plain", text: "Lunch is at 12:30 on Friday." }, onOpen: undefined },
  },
  play: {
    Default: presses(/Lunch with Ana/, onOpen),
    Choices: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onChoose.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Not now" }));
      await expect(onChoose.mock.calls).toEqual([[2]]);
    },
    Settled: offersNothing,
  },
};
