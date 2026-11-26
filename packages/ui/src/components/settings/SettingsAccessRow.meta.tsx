import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { inGroup } from "./samples.ts";
import type { SettingsAccessRowProps } from "./SettingsAccessRow.tsx";

const onOpen = fn();

export const meta: ComponentMeta<SettingsAccessRowProps> = {
  args: { access: "camera", grant: "allowed", onOpen },
  decorator: inGroup,
  examples: { Approximate: { access: "location", grant: "approximate" }, Unavailable: { access: "photos", grant: "unavailable" } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onOpen.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: /Camera/ }));
      await expect(onOpen.mock.calls.length).toBe(1);
    },
  },
};
