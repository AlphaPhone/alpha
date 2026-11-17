import { expect, userEvent, within } from "storybook/test";
import { RadioGroup } from "./RadioGroup.tsx";
import { meta } from "./RadioGroup.meta.tsx";

export default { title: "Ui/RadioGroup", component: RadioGroup };

/** A disabled group refuses every choice in it, by pointer and by key. The generated check presses the group itself, which is no control, so this one presses a choice. */
export const Disabled = {
  args: { ...meta.args, disabled: true },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    const large = canvas.getByRole("radio", { name: "Large" });
    const chosen = () => ["Small", "Medium", "Large"].map((name) => canvas.getByRole("radio", { name }).getAttribute("aria-checked"));
    await userEvent.click(large, { pointerEventsCheck: 0 });
    await userEvent.click(canvas.getByText("Large"), { pointerEventsCheck: 0 });
    large.focus();
    await userEvent.keyboard(" {ArrowUp}{ArrowDown}{Enter}");
    canvas.getByRole("radiogroup").focus();
    await userEvent.keyboard(" {ArrowDown}");
    await expect(chosen()).toEqual(["false", "true", "false"]);
  },
};
