import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { StartupAssistantSurfaceProps } from "./StartupAssistantSurface.tsx";
import { fullHeight, sampleChat } from "./samples.ts";

const onClose = fn();

export const meta: ComponentMeta<StartupAssistantSurfaceProps> = {
  args: { children: sampleChat, onClose },
  decorator: fullHeight,
  examples: { "Not yet known": { onClose: undefined } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onClose.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Close" }));
      await expect(onClose.mock.calls.length).toBe(1);
    },
    "Not yet known": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("button", { name: "Close" })).toBeDisabled(),
  },
};
