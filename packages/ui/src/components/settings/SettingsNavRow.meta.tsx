import { Sun } from "lucide-react";
import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { inGroup } from "./samples.ts";
import type { SettingsNavRowProps } from "./SettingsNavRow.tsx";

const onOpen = fn();

export const meta: ComponentMeta<SettingsNavRowProps> = {
  args: { title: "Display", icon: <Sun />, onOpen },
  decorator: inGroup,
  examples: { Value: { value: "Dark" }, "Not pressable": { onOpen: undefined } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onOpen.mockClear();
      const row = within(canvasElement).getByRole("button", { name: "Display" });
      await userEvent.click(row);
      await userEvent.keyboard("{Enter}");
      await expect(onOpen.mock.calls.length).toBe(2);
    },
    "Not pressable": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button")).toBeNull(),
  },
};
