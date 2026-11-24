import { Globe } from "lucide-react";
import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { inGroup } from "./samples.ts";
import type { SettingsSwitchRowProps } from "./SettingsSwitchRow.tsx";

const onCheckedChange = fn();

const refuses = async ({ canvasElement }: { canvasElement: HTMLElement }) => {
  onCheckedChange.mockClear();
  const toggle = within(canvasElement).getByRole("switch");
  await userEvent.click(toggle, { pointerEventsCheck: 0 });
  await userEvent.click(within(canvasElement).getByText("Ask before Alpha acts"), { pointerEventsCheck: 0 });
  await expect([toggle.hasAttribute("disabled"), onCheckedChange.mock.calls.length]).toEqual([true, 0]);
};

export const meta: ComponentMeta<SettingsSwitchRowProps> = {
  args: { title: "Ask before Alpha acts", detail: "On the web, with the camera and on photos", icon: <Globe />, checked: true, onCheckedChange },
  decorator: inGroup,
  examples: { Reading: { reading: true }, Saving: { saving: true }, Locked: { locked: true }, Off: { checked: false } },
  play: {
    Off: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onCheckedChange.mockClear();
      await userEvent.click(within(canvasElement).getByText("Ask before Alpha acts"));
      await expect(onCheckedChange.mock.calls).toEqual([[true]]);
    },
    Reading: refuses,
    Saving: refuses,
    Locked: refuses,
  },
};
