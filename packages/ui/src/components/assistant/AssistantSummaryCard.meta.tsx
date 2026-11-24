import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AssistantSummaryCardProps } from "./AssistantSummaryCard.tsx";
import { offersNothing, refuses } from "./plays.ts";

const onSave = fn();
const onUseInEmail = fn();

export const meta: ComponentMeta<AssistantSummaryCardProps> = {
  args: {
    title: "Your week",
    bullets: ["Three meetings moved to Thursday", "Invoice from Bruno is due Friday", "Ana asked about lunch"],
    onSave,
    onUseInEmail,
  },
  examples: {
    Saving: { save: "saving" },
    Saved: { save: "saved", onSave: undefined },
    "Not saved": { save: "refused" },
    "Maybe saved": { save: "unknown", onSave: undefined },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onSave.mockClear();
      onUseInEmail.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Save to Notes" }));
      await userEvent.click(canvas.getByRole("button", { name: "Use in email" }));
      await expect([onSave.mock.calls.length, onUseInEmail.mock.calls.length]).toEqual([1, 1]);
    },
    Saving: refuses("Save to Notes", onSave),
    Settled: offersNothing,
  },
};
