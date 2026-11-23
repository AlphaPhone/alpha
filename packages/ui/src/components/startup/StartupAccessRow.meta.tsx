import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { inGroup } from "./samples.ts";
import type { StartupAccessRowProps } from "./StartupAccessRow.tsx";

const onAct = fn();

export const meta: ComponentMeta<StartupAccessRowProps> = {
  args: { access: "Camera", word: "AskFirst", current: true, action: "Allow", onAct },
  decorator: inGroup,
  examples: {
    "Android answering": { busy: true, onAct: undefined },
    "Needs Settings": { word: "Off", action: "Settings" },
    "Could not check": { word: "CouldNotCheck", action: "Try again" },
    "Android never answered": { action: "Check" },
    "Being read": { word: "Reading", action: undefined },
    "Allowed, in review": { word: "Allowed", action: "Settings" },
    "Not the step": { access: "Calendar", word: "Allowed", current: false, action: undefined, onAct: undefined },
    "Precise location": { access: "Location", word: "Precise", current: false, action: undefined, onAct: undefined },
    "Selected photos": { access: "Photos", word: "SelectedPhotos", current: false, action: undefined, onAct: undefined },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onAct.mockClear();
      const canvas = within(canvasElement);
      await expect(canvas.getByText("Photos and text scans")).toBeVisible();
      await userEvent.click(canvas.getByRole("button", { name: "Allow" }));
      await expect(onAct.mock.calls.length).toBe(1);
    },
    "Android answering": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const button = within(canvasElement).getByRole("button", { name: "Allow" });
      await userEvent.click(button);
      await expect([button.getAttribute("aria-busy"), onAct.mock.calls.length]).toEqual(["true", 0]);
    },
    "Being read": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button")).toBeNull(),
    "Not the step": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByText("Photos and text scans")).toBeNull(),
  },
};
