import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { HomeAgendaCardProps } from "./HomeAgendaCard.tsx";

const onClick = fn();

export const meta: ComponentMeta<HomeAgendaCardProps> = {
  args: { heading: "Tue, Nov 24", origin: "Work", item: { title: "Design review", when: "3:00 PM – 3:30 PM" }, onClick },
  examples: {
    "Agent's calendar": { origin: "Alpha", item: { title: "Call the plumber back", when: "5:30 PM – 6:00 PM" } },
    Overdue: {
      heading: "Overdue reminder",
      origin: undefined,
      item: { title: "Renew the car insurance", when: "Due 9:00 AM" },
      next: { text: "Next: Design review 3:00 PM", source: "Work" },
    },
    "Not current": { heading: "Mon, Nov 23", readLine: "Not updated since Mon 9:00 AM", item: { title: "Dentist", when: "4:00 PM – 5:00 PM" } },
    "Long title": { item: { title: "Quarterly planning with the whole product and design group, room 4", when: "All day" } },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onClick.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: /Design review/ }));
      await expect(onClick.mock.calls.length).toBe(1);
    },
  },
};
