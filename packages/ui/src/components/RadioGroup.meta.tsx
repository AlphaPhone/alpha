import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { Label } from "./Label.tsx";
import { RadioGroupItem, type RadioGroupProps } from "./RadioGroup.tsx";

const onValueChange = fn();
const children = (
  <>
    <Label htmlFor="size-small"><RadioGroupItem id="size-small" value="small" />Small</Label>
    <Label htmlFor="size-medium"><RadioGroupItem id="size-medium" value="medium" />Medium</Label>
    <Label htmlFor="size-large"><RadioGroupItem id="size-large" value="large" />Large</Label>
  </>
);

export const meta: ComponentMeta<RadioGroupProps> = {
  args: { "aria-label": "Text size", defaultValue: "medium", children, onValueChange },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onValueChange.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("radio", { name: "Large" }));
      await userEvent.keyboard("{ArrowUp>}");
      await waitFor(() => expect(["Small", "Medium", "Large"].map((name) => canvas.getByRole("radio", { name }).getAttribute("aria-checked"))).toEqual(["false", "true", "false"]));
      await userEvent.keyboard("{/ArrowUp}");
      await expect(onValueChange.mock.calls).toEqual([["large"], ["medium"]]);
    },
  },
};
