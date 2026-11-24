import { expect, userEvent, within } from "storybook/test";

type Spy = { mockClear: () => unknown; mock: { calls: unknown[][] } };
type Play = (context: { canvasElement: HTMLElement }) => Promise<void>;

/** A story that offers nothing: no button is pressed on it. */
export const offersNothing: Play = async ({ canvasElement }) => {
  await expect(within(canvasElement).queryByRole("button")).toBeNull();
};

/** A story where pressing the named button calls the handler once. */
export const presses = (name: string | RegExp, spy: Spy): Play => async ({ canvasElement }) => {
  spy.mockClear();
  await userEvent.click(within(canvasElement).getByRole("button", { name }));
  await expect(spy.mock.calls.length).toBe(1);
};

/** A story where the named button refuses a press: its handler is never called. */
export const refuses = (name: string | RegExp, spy: Spy): Play => async ({ canvasElement }) => {
  spy.mockClear();
  await userEvent.click(within(canvasElement).getByRole("button", { name }), { pointerEventsCheck: 0 });
  await expect(spy.mock.calls.length).toBe(0);
};
