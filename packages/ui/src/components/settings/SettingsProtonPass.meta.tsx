import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { reported } from "./samples.ts";
import type { SettingsProtonPassProps } from "./SettingsProtonPass.tsx";

const unknown = reported("—", "off");
const onAction = fn();
const onRefresh = fn();

export const meta: ComponentMeta<SettingsProtonPassProps> = {
  args: { installation: unknown, selection: unknown, autofill: unknown, onAction, onRefresh },
  examples: {
    Verified: { installation: reported("Verified", "ok"), selection: reported("Selected", "ok"), autofill: reported("Available", "ok"), extra: "open" },
    Absent: { installation: reported("Not installed", "off"), selection: reported("None", "off"), extra: "install" },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      const provider = canvas.getByRole("button", { name: /^Proton Pass\b/ });
      await expect(provider).toHaveAttribute("aria-expanded", "false");
      await userEvent.click(provider);
      await expect(provider).toHaveAttribute("aria-expanded", "true");
      onAction.mockClear();
      await userEvent.click(canvas.getByRole("button", { name: "Choose provider" }));
      await expect(onAction).toHaveBeenCalledWith("settings");
    },
  },
};
