import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { fullHeight } from "./samples.ts";
import type { SettingsCarrierPageProps } from "./SettingsCarrierPage.tsx";

const onShow = fn();
const onCopy = fn();

export const meta: ComponentMeta<SettingsCarrierPageProps> = {
  args: { fields: [], onShow, onBack: fn(), onAndroid: fn() },
  decorator: fullHeight,
  examples: {
    Reading: { reading: true, onShow: undefined },
    Shown: {
      fields: [{ name: "IMEI 1", identifier: true, value: "356938035643809" }, { name: "ICCID", missing: "access-denied" }, { name: "Carrier", value: "Example Mobile" }],
      onShow: undefined,
      onReadEid: fn(),
      onCopy,
      smsChoice: true,
    },
    Copied: { fields: [{ name: "IMEI 1", identifier: true, value: "356938035643809" }], onShow: undefined, copied: "copied" },
    Failed: { failed: true },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onShow.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Show identifiers" }));
      await expect(onShow.mock.calls.length).toBe(1);
    },
    Shown: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onCopy.mockClear();
      const canvas = within(canvasElement);
      await expect(canvas.queryByRole("button", { name: "Copy ICCID" })).toBeNull();
      await userEvent.click(canvas.getByRole("button", { name: "Copy IMEI 1" }));
      await expect(onCopy.mock.calls).toEqual([["356938035643809"]]);
    },
  },
};
