import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { SwitchProps } from "./Switch.tsx";

const onCheckedChange = fn();

export const meta: ComponentMeta<SwitchProps> = {
  args: { "aria-label": "Do not disturb", onCheckedChange },
  examples: { On: { defaultChecked: true } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onCheckedChange.mockClear();
      const toggle = within(canvasElement).getByRole("switch", { name: "Do not disturb" });
      await userEvent.click(toggle);
      await expect(toggle.getAttribute("aria-checked")).toBe("true");
      await userEvent.keyboard(" ");
      await expect([toggle.getAttribute("aria-checked"), onCheckedChange.mock.calls]).toEqual(["false", [[true], [false]]]);
    },
  },
};
