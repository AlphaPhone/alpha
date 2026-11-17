import { expect, fn, userEvent, within } from "storybook/test";
import { Button, type ButtonProps } from "./Button.tsx";

export default { title: "Ui/Button", component: Button };

const link = () => {
  const onClick = fn();
  return { onClick, args: { asChild: true, onClick, children: <a href="#notes" onClick={onClick}>Notes</a> } };
};
const plain = link();
const disabled = link();
const loading = link();

const refuses = async (anchor: HTMLElement, onClick: ReturnType<typeof fn>) => {
  await userEvent.click(anchor, { pointerEventsCheck: 0 });
  anchor.focus();
  await userEvent.keyboard("{Enter} ");
  await expect(onClick).not.toHaveBeenCalled();
};

/** A link that looks like a button: `asChild` needs an element to become, which no type can supply. */
export const AsChild = {
  args: plain.args,
  play: async ({ args, canvasElement }: { args: ButtonProps; canvasElement: HTMLElement }) => {
    await userEvent.click(within(canvasElement).getByRole("link"));
    await expect(args.onClick).toHaveBeenCalled();
  },
};

/** A link has no `disabled`: it says so, leaves the tab order and refuses presses. */
export const DisabledLink = {
  args: { ...disabled.args, disabled: true },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const anchor = within(canvasElement).getByRole("link");
    await expect([anchor.getAttribute("aria-disabled"), anchor.tabIndex]).toEqual(["true", -1]);
    await refuses(anchor, disabled.onClick);
  },
};

/** A loading link says it is busy as well. */
export const LoadingLink = {
  args: { ...loading.args, loading: true },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const anchor = within(canvasElement).getByRole("link");
    await expect([anchor.getAttribute("aria-disabled"), anchor.getAttribute("aria-busy"), anchor.tabIndex]).toEqual(["true", "true", -1]);
    await refuses(anchor, loading.onClick);
  },
};
