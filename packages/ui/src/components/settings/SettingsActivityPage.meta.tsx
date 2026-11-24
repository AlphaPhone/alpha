import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { fullHeight } from "./samples.ts";
import type { SettingsActionItem, SettingsActivityPageProps } from "./SettingsActivityPage.tsx";

const onDecline = fn();
const onReconcile = fn();
const onRecover = fn();
const onRefresh = fn();
const onHandOver = fn();

const actions: SettingsActionItem[] = [
  { proposal: 1, title: "Open the Lisbon flights page in Browser", detail: "Waiting for your word", declinable: true, unsettled: false },
  { proposal: 2, title: "Send a photo of the receipt to Ana", detail: "Yesterday, 18:20", declinable: false, unsettled: true },
  { proposal: 3, title: "Add lunch with Bruno to Calendar", detail: "Monday, 12:30", declinable: false, unsettled: false },
];

export const meta: ComponentMeta<SettingsActivityPageProps> = {
  args: { connection: "ready", actions, onBack: fn(), onRecover, onRefresh, onDecline, onReconcile, onHandOver },
  decorator: fullHeight,
  examples: {
    Reading: { actions: [], reading: true },
    "Nothing listed": { actions: [] },
    "Read failed": { failed: true },
    "Read failed with nothing": { actions: [], failed: true },
    "Needs restart": { connection: "needs-restart", actions: [] },
    "Needs retry": { connection: "needs-retry", actions: [] },
    Starting: { connection: "starting", actions: [] },
    Offline: { connection: "offline", actions: [] },
    Unpackaged: { connection: "unpackaged", actions: [] },
    Development: { development: true },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onDecline.mockClear();
      onReconcile.mockClear();
      onHandOver.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Decline" }));
      await userEvent.click(canvas.getByRole("button", { name: "Didn’t" }));
      await userEvent.click(canvas.getByRole("button", { name: "Conversations" }));
      await expect([onDecline.mock.calls, onReconcile.mock.calls, onHandOver.mock.calls]).toEqual([[[1]], [[2, false]], [["conversations"]]]);
    },
    "Needs restart": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onRecover.mockClear();
      const canvas = within(canvasElement);
      await expect(canvas.queryByRole("button", { name: "Decline" })).toBeNull();
      await userEvent.click(canvas.getByRole("button", { name: "Restart Alpha" }));
      await expect(onRecover.mock.calls).toEqual([["restart"]]);
    },
    Reading: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onRefresh.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Refresh actions" }), { pointerEventsCheck: 0 });
      await expect(onRefresh.mock.calls.length).toBe(0);
    },
    "Nothing listed": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onRefresh.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Refresh actions" }));
      await expect(onRefresh.mock.calls.length).toBe(1);
    },
    Development: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onHandOver.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Restart details" }));
      await expect(onHandOver.mock.calls).toEqual([["restart-details"]]);
    },
  },
};
