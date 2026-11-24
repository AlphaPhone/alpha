import { expect, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { SettingsResetProgressProps } from "./SettingsResetProgress.tsx";

export const meta: ComponentMeta<SettingsResetProgressProps> = {
  args: { step: "revoking" },
  play: {
    Default: ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      return expect(["Done", "Working", "Waiting"].map((name) => canvas.getAllByRole("img", { name }).length)).toEqual([1, 1, 1]);
    },
  },
};
