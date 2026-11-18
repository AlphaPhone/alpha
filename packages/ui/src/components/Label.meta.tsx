import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { Checkbox } from "./Checkbox.tsx";
import { Input } from "./Input.tsx";
import type { LabelProps } from "./Label.tsx";

const checked = fn();

export const meta: ComponentMeta<LabelProps> = {
  args: { children: <><Checkbox onCheckedChange={checked} />Remind me</> },
  examples: { "With input": { htmlFor: "folder-name", children: <>Name<Input id="folder-name" /></> } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      checked.mockClear();
      const canvas = within(canvasElement);
      const checkbox = canvas.getByRole("checkbox", { name: "Remind me" });
      await userEvent.click(canvas.getByText("Remind me"));
      await expect(checkbox.getAttribute("aria-checked")).toBe("true");
      checkbox.focus();
      await userEvent.keyboard(" ");
      await expect([checkbox.getAttribute("aria-checked"), checked.mock.calls]).toEqual(["false", [[true], [false]]]);
    },
    "With input": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByText("Name"));
      await userEvent.keyboard("Travel");
      await expect(canvas.getByRole<HTMLInputElement>("textbox", { name: "Name" }).value).toBe("Travel");
    },
  },
};
