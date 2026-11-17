import { expect, userEvent, within } from "storybook/test";
import { RadioGroup } from "./RadioGroup.tsx";
import { meta } from "./RadioGroup.meta.tsx";

export default { title: "Ui/RadioGroup", component: RadioGroup };

/** A disabled group refuses every choice in it. The generated check presses the group itself, which is no control, so this one presses a choice. */
export const Disabled = {
  args: { ...meta.args, disabled: true },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    const large = canvas.getByRole("radio", { name: "Large" });
    await userEvent.click(large, { pointerEventsCheck: 0 });
    await userEvent.click(canvas.getByText("Large"), { pointerEventsCheck: 0 });
    await expect([large.getAttribute("aria-checked"), canvas.getByRole("radio", { name: "Medium" }).getAttribute("aria-checked")]).toEqual(["false", "true"]);
  },
};
