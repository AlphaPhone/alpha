import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { HomeAgendaCardProps } from "./HomeAgendaCard.tsx";

const onClick = fn();

export const meta: ComponentMeta<HomeAgendaCardProps> = {
  args: { item: { title: "Design review", when: "3:00 PM", source: "Work" }, onClick },
  examples: {
    "Agent's calendar": { item: { title: "Call the plumber back", when: "5:30 PM", source: "Alpha" } },
    Overdue: {
      overdue: true,
      item: { title: "Renew the car insurance", when: "Due 9:00 AM", source: "Reminder" },
      next: { title: "Design review", when: "3:00 PM", source: "Work" },
    },
    "Not current": { notCurrent: true, item: { title: "Dentist", when: "Yesterday 4:00 PM", source: "Personal" } },
    "Long title": { item: { title: "Quarterly planning with the whole product and design group, room 4", when: "All day", source: "Work" } },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onClick.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: /Design review/ }));
      await expect(onClick.mock.calls.length).toBe(1);
    },
    "Not current": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("button")).toHaveAccessibleName(/Not up to date/),
  },
};
