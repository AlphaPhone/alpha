import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { fullHeight, reported, unavailable, waiting } from "./samples.ts";
import type { SettingsGeneralPageProps } from "./SettingsGeneralPage.tsx";

const onOpen = fn();
const onErase = fn();
const onAndroid = fn();
const onRequestHome = fn();

export const meta: ComponentMeta<SettingsGeneralPageProps> = {
  args: { wifi: reported("Home"), bluetooth: reported("On", "ok"), mobileData: reported("Off", "off"), theme: "light", alerts: reported("On", "ok"), onBack: fn(), onOpen, onAndroid },
  decorator: fullHeight,
  examples: {
    Waiting: { wifi: waiting, bluetooth: waiting, mobileData: waiting },
    Unavailable: { wifi: unavailable, bluetooth: unavailable, mobileData: unavailable },
    "Alpha image": { image: true },
    "On the phone": { onPhone: true, onErase },
    Reviewing: { onPhone: true, reviewing: true },
    "Not confirmed": { onPhone: true, said: "not-confirmed-its-you" },
    "Screen lock first": { onPhone: true, onErase, said: "set-a-screen-lock" },
    "Android starting": { starting: { target: "wifi-networks" } },
    "Can set as Home": { onPhone: true, home: "another", assistant: "alpha", onRequestHome },
    "Requesting Home": { onPhone: true, home: "another", assistant: "alpha", requestingHome: true },
    "Roles not on this phone": { onPhone: true, home: "not-on-this-phone", assistant: "not-on-this-phone" },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onOpen.mockClear();
      onAndroid.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: /^Display/ }));
      await userEvent.click(canvas.getByRole("button", { name: /Bluetooth/ }));
      await expect([onOpen.mock.calls, onAndroid.mock.calls]).toEqual([[["display"]], [[{ target: "bluetooth-devices", channel: undefined }]]]);
    },
    "Can set as Home": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onRequestHome.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Set as Home" }));
      await expect(onRequestHome.mock.calls.length).toBe(1);
    },
    "Requesting Home": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button", { name: "Set as Home" })).toBeNull(),
    Reviewing: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).queryByRole("button", { name: "Erase all data" })).toBeNull(),
    "Alpha image": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("button", { name: "Phone" })).toBeTruthy(),
    "On the phone": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onOpen.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Network" }));
      await userEvent.click(canvas.getByRole("button", { name: /^Carrier & SIM setup/ }));
      await expect(onOpen.mock.calls).toEqual([["network"], ["carrier"]]);
    },
  },
};
