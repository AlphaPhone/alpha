import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AssistantChoicesCardProps } from "./AssistantChoicesCard.tsx";
import { refuses } from "./plays.ts";

const onChoose = fn();

export const meta: ComponentMeta<AssistantChoicesCardProps> = {
  args: { title: "Share your location?", options: ["Share once", "Share while open", "Not now"], onChoose },
  examples: { "Not taken": { notTaken: true } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onChoose.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Share while open" }));
      await expect(onChoose.mock.calls).toEqual([[2]]);
    },
    Waiting: refuses("Share once", onChoose),
  },
};
