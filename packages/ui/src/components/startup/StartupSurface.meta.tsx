import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { StartupSurfaceProps } from "./StartupSurface.tsx";
import { fullHeight, sampleChat, sampleHome } from "./samples.ts";

const onClose = fn();
const onExitMock = fn();

export const meta: ComponentMeta<StartupSurfaceProps> = {
  args: { presentation: "Launcher", known: true, connection: "Connected", homeTakesInput: true, home: sampleHome, chat: sampleChat, onClose, onExitMock },
  decorator: fullHeight,
  examples: {
    "Waiting for the agent": { connection: "Pending" },
    "Before Alpha knows": { known: false, connection: "Pending" },
    "Agent unreachable": { connection: "Unreachable" },
    "Agent offline": { connection: "Offline" },
    "Agent restarting": { connection: "Recovering" },
    "Something over Home": { homeTakesInput: false },
    "Assistant only": { presentation: "AssistantOnly" },
    "Mock mode": { mocking: true },
  },
  play: {
    Default: ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      return expect([canvas.getByRole("heading", { name: "Tuesday 17" }).closest("[inert]"), canvas.queryByRole("img", { name: "Alpha" })]).toEqual([null, null]);
    },
    "Waiting for the agent": ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      return expect([canvas.getByRole("img", { name: "Alpha" }) !== null, canvas.queryByRole("heading", { name: "Tuesday 17" })]).toEqual([true, null]);
    },
    "Something over Home": ({ canvasElement }: { canvasElement: HTMLElement }) =>
      expect(within(canvasElement).getByRole("heading", { name: "Tuesday 17", hidden: true }).closest("[inert]")).not.toBeNull(),
    "Assistant only": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onClose.mockClear();
      const canvas = within(canvasElement);
      await expect([canvas.queryByRole("heading", { name: "Tuesday 17" }), canvas.queryByRole("img", { name: "Alpha" })]).toEqual([null, null]);
      await userEvent.click(canvas.getByRole("button", { name: "Close" }));
      await expect(onClose.mock.calls.length).toBe(1);
    },
    "Mock mode": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onExitMock.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Exit mock mode" }));
      await expect(onExitMock.mock.calls.length).toBe(1);
    },
  },
};
