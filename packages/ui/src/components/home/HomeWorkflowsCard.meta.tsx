import { expect, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { HomeWorkflowsCardProps } from "./HomeWorkflowsCard.tsx";

export const meta: ComponentMeta<HomeWorkflowsCardProps> = {
  args: {
    lines: [{ title: "Morning brief", detail: "Enabled" }, { title: "Receipts to Files", detail: "Enabled" }],
    more: 3,
    freshness: "UpToDate",
  },
  examples: { One: { lines: [{ title: "Morning brief", detail: "Enabled" }], more: 0 } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const card = within(canvasElement).getByRole("button");
      await expect(card).toHaveTextContent("Morning briefReceipts to Files+3 more");
      await expect(within(card).queryByText("Enabled")).toBeNull();
    },
  },
};
