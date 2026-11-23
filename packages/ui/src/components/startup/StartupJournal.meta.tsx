import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { StartupJournalProps } from "./StartupJournal.tsx";

const onClear = fn();

export const meta: ComponentMeta<StartupJournalProps> = {
  args: {
    entries: [
      { when: "12 Oct, 08:14", kind: "Crashed" },
      { when: "14 Oct, 19:02", kind: "FailedToDraw" },
      { when: "14 Oct, 19:03", kind: "KeptFailing" },
      { when: "2 Nov, 07:45", kind: "StoppedAnswering" },
      { when: "9 Nov, 22:30", kind: "FailedToStart" },
    ],
    onClear,
  },
  examples: { "Older dropped": { dropped: 3 }, Empty: { entries: [], onClear: undefined } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onClear.mockClear();
      const canvas = within(canvasElement);
      await expect(canvas.getAllByRole("button").length).toBe(1);
      await userEvent.click(canvas.getByRole("button", { name: "Clear" }));
      await expect(onClear.mock.calls.length).toBe(1);
    },
    Empty: ({ canvasElement }: { canvasElement: HTMLElement }) => expect([within(canvasElement).getByText("No failures") !== null, within(canvasElement).queryByRole("button")]).toEqual([true, null]),
  },
};
