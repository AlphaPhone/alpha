import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { accessRows } from "./samples.ts";
import type { StartupAccessPanelProps } from "./StartupAccessPanel.tsx";

const onAct = fn();
const onContinue = fn();
const onSkip = fn();
const onDone = fn();
const done = { Notifications: "Allowed", Microphone: "Allowed" } as const;
const asking = { access: "Camera", action: "Allow" } as const;

export const meta: ComponentMeta<StartupAccessPanelProps> = {
  args: { rows: accessRows(done, asking), current: "Camera", place: { step: 3, count: 7 }, onAct, onContinue, onSkip: undefined, onDone: undefined },
  examples: {
    "Allow first": { notice: "AllowFirst" },
    "Android answering": { rows: accessRows(done, { ...asking, busy: true }), onAct: undefined, onContinue: undefined },
    "Needs Settings": { rows: accessRows({ ...done, Camera: "Off" }, { access: "Camera", action: "Settings" }), onSkip },
    "Still off": { rows: accessRows({ ...done, Camera: "Off" }, { access: "Camera", action: "Settings" }), notice: "StillOff", onSkip },
    "Could not check": { rows: accessRows({ ...done, Camera: "CouldNotCheck" }, { access: "Camera", action: "Try again" }), notice: "NotConfirmed", onSkip },
    "Android never answered": { rows: accessRows(done, { ...asking, action: "Check" }), onSkip },
    "Not saved": { notice: "NotSaved" },
    "In a browser": { rows: accessRows({ Notifications: "Allowed" }, { access: "Microphone", action: "Allow" }, ["Notifications", "Microphone", "Camera", "Location"]), current: "Microphone", place: { step: 2, count: 4 } },
    "Review of one": {
      rows: accessRows({ ...done, Camera: "Allowed", Location: "Precise" }, { access: "Location", action: "Settings" }),
      current: "Location",
      place: undefined,
      review: true,
      onContinue: undefined,
      onDone,
    },
    "Review of all": { rows: accessRows({ ...done, Camera: "Allowed", Location: "Precise", Calendar: "Off" }), current: undefined, place: undefined, review: true, onAct: undefined, onContinue: undefined, onDone },
  },
  play: {
    Default: async () => {
      onAct.mockClear();
      onContinue.mockClear();
      const sheet = await screen.findByRole("dialog", { name: "Access" });
      await waitFor(() => expect(within(sheet).getByText("Step 3 of 7")).toBeVisible());
      await userEvent.click(within(sheet).getByRole("button", { name: "Allow" }));
      await userEvent.click(within(sheet).getByRole("button", { name: "Continue" }));
      await expect([onAct.mock.calls, onContinue.mock.calls.length]).toEqual([[["Camera"]], 1]);
      await expect(within(sheet).queryByRole("button", { name: "Skip" })).toBeNull();
    },
    "Allow first": () => waitFor(async () => expect(await screen.findByText("Allow first")).toBeVisible()),
    "Android answering": async () => {
      const sheet = await screen.findByRole("dialog", { name: "Access" });
      await expect([within(sheet).getByRole("button", { name: "Continue" }), within(sheet).queryByRole("button", { name: "Skip" })]).toEqual([expect.objectContaining({ disabled: true }), null]);
    },
    "Needs Settings": async () => {
      onSkip.mockClear();
      const sheet = await screen.findByRole("dialog", { name: "Access" });
      await userEvent.click(within(sheet).getByRole("button", { name: "Skip" }));
      await expect(onSkip.mock.calls.length).toBe(1);
    },
    "Review of one": async () => {
      onDone.mockClear();
      const sheet = await screen.findByRole("dialog", { name: "Access" });
      await expect(within(sheet).queryByText(/^Step /)).toBeNull();
      await userEvent.keyboard("{Escape}");
      await userEvent.click(within(sheet).getByRole("button", { name: "Done" }));
      await expect(onDone.mock.calls.length).toBe(2);
    },
    "Review of all": async () => {
      const sheet = await screen.findByRole("dialog", { name: "Access" });
      await expect(within(sheet).queryAllByRole("button").map((button) => button.textContent)).toEqual(["Done"]);
    },
  },
};
