import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AssistantGrabberProps } from "./AssistantGrabber.tsx";

const onPress = fn();
const onDrag = fn();
const onRelease = fn();
const onLift = fn();
const onTap = fn();

export const meta: ComponentMeta<AssistantGrabberProps> = {
  args: { onPress, onDrag, onRelease, onLift, onTap, onCancel: fn() },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      for (const spy of [onPress, onDrag, onRelease, onLift, onTap]) spy.mockClear();
      const handle = within(canvasElement).getByRole("button", { name: "Resize chat" });
      await userEvent.pointer([
        { keys: "[MouseLeft>]", target: handle, coords: { clientX: 100, clientY: 400 } },
        { coords: { clientX: 100, clientY: 300 } },
        { coords: { clientX: 100, clientY: 120 } },
        { keys: "[/MouseLeft]", coords: { clientX: 100, clientY: 120 } },
      ]);
      await expect([onPress.mock.calls.length, onDrag.mock.calls.length > 0, onRelease.mock.calls.length, onLift.mock.calls.length]).toEqual([1, true, 1, 0]);
      await expect(onRelease.mock.calls[0][0]).toMatchObject({ direction: "up", y: 120 });
    },
    "Tap": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      for (const spy of [onPress, onDrag, onRelease, onLift, onTap]) spy.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Resize chat" }));
      await expect([onPress.mock.calls.length, onDrag.mock.calls.length, onRelease.mock.calls.length, onLift.mock.calls.length, onTap.mock.calls.length]).toEqual([1, 0, 0, 1, 1]);
    },
  },
  examples: { Tap: {} },
};
