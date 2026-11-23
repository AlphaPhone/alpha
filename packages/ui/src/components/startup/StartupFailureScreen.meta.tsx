import { expect, fireEvent, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { StartupFailureScreenProps } from "./StartupFailureScreen.tsx";

const onReload = fn();
const onReloadAnyway = fn();
const onSwitchHome = fn();
const home = { asHome: true, onSwitchHome };

export const meta: ComponentMeta<StartupFailureScreenProps> = {
  args: { kind: "FailedToDraw", version: "1.4.2", platform: "android", onReload, ...home },
  examples: {
    "Kept failing": { kind: "KeptFailing" },
    "Saving the drafts": { saving: true, onReload: undefined },
    "Unsaved edits": { unsaved: true, onReloadAnyway },
    "Switching Home": { switching: true, onSwitchHome: undefined },
    "Switch Home failed": { switchFailed: true },
    "No WebView": { withoutWebView: true, onReload: undefined },
    "Not Android's Home": { asHome: false, onSwitchHome: undefined },
    "In a browser": { platform: "web", asHome: false, onSwitchHome: undefined },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onReload.mockClear();
      onSwitchHome.mockClear();
      const canvas = within(canvasElement);
      await expect(canvas.getByRole("alertdialog", { name: "Something went wrong" })).toBeVisible();
      await expect(canvas.getByRole("button", { name: "Reload" })).toHaveFocus();
      await expect(canvas.queryByRole("button", { name: "Reload anyway" })).toBeNull();
      await userEvent.click(canvas.getByText("Diagnostics"));
      await expect([canvas.getByText("Failed to draw"), canvas.getByText("1.4.2"), canvas.getByText("android")].every((item) => item.checkVisibility())).toBe(true);
      await userEvent.click(canvas.getByRole("button", { name: "Reload" }));
      await userEvent.click(canvas.getByRole("button", { name: "Switch Home" }));
      await expect([onReload.mock.calls.length, onSwitchHome.mock.calls.length]).toEqual([1, 1]);
    },
    "Saving the drafts": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onReload.mockClear();
      const reload = within(canvasElement).getByRole("button", { name: "Reload" });
      await fireEvent.click(reload);
      await expect([reload.getAttribute("aria-busy"), onReload.mock.calls.length]).toEqual(["true", 0]);
    },
    "Unsaved edits": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onReloadAnyway.mockClear();
      const canvas = within(canvasElement);
      await expect(canvas.getByRole("alert")).toHaveTextContent("Unsaved edits would be lost");
      await userEvent.click(canvas.getByRole("button", { name: "Reload anyway" }));
      await expect(onReloadAnyway.mock.calls.length).toBe(1);
    },
    "No WebView": ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      return expect([canvas.queryByRole("button", { name: "Reload" }), canvas.getByRole("button", { name: "Switch Home" })]).toEqual([null, expect.anything()]);
    },
    "In a browser": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button", { name: "Switch Home" })).toBeNull(),
  },
};
