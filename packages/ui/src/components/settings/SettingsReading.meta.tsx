import { expect, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { reported, unavailable, waiting } from "./samples.ts";
import type { SettingsReadingProps } from "./SettingsReading.tsx";

export const meta: ComponentMeta<SettingsReadingProps> = {
  args: { reading: reported("87%") },
  examples: {
    Waiting: { reading: waiting },
    Unavailable: { reading: unavailable },
    "With a state": { reading: reported("Allowed", "ok") },
  },
  play: {
    Waiting: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByText("Reading")).toBeTruthy(),
    "With a state": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByText("Allowed")).toBeTruthy(),
  },
};
