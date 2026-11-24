// spec/settings/carrier.md, "Story: Get my phone ready for a carrier's SIM"
import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { CarrierSetupViewProps } from "./CarrierSetupView.tsx";
import { carrierActive, carrierFailed, carrierIdle, carrierNoSim, carrierReading } from "./fixtures.ts";

export const meta: ComponentMeta<CarrierSetupViewProps> = {
  args: { setup: carrierIdle, native: true, notice: "", onShow: fn(), onShowEid: fn(), onCopy: fn(), onOpenScreen: fn() },
  examples: {
    NoSim: { setup: carrierNoSim },
    Active: { setup: carrierActive },
    Reading: { setup: carrierReading },
    Failed: { setup: carrierFailed },
    Browser: { native: false },
  },
  play: {
    Default: async ({ canvasElement, args }) => {
      const page = within(canvasElement);
      await expect(page.queryByText("123456789012345")).toBeNull();
      await userEvent.click(page.getByRole("button", { name: "Show identifiers" }));
      await expect(args.onShow).toHaveBeenCalled();
      await userEvent.click(page.getByRole("button", { name: "Android device identifiers / About phone" }));
      await expect(args.onOpenScreen).toHaveBeenCalledWith("ScreenIdentifiers");
    },
    NoSim: async ({ canvasElement, args }) => {
      const page = within(canvasElement);
      await expect(page.getByText("Access denied by Android")).toBeVisible();
      await expect(page.getByText("No active subscription reported")).toBeVisible();
      await userEvent.click(page.getByRole("button", { name: "Copy IMEI 1" }));
      await expect(args.onCopy).toHaveBeenCalledWith({ tag: "CopyImei", slot: 0 }, "IMEI 1");
      await userEvent.click(page.getByRole("button", { name: "Read eSIM EID (optional)" }));
      await expect(args.onShowEid).toHaveBeenCalled();
    },
    Active: async ({ canvasElement, args }) => {
      const page = within(canvasElement);
      await expect(page.getByText("Active SIM · subscription 3")).toBeVisible();
      await userEvent.click(page.getByRole("button", { name: "Copy EID (eSIM)" }));
      await expect(args.onCopy).toHaveBeenCalledWith({ tag: "CopyEid" }, "EID (eSIM)");
    },
    Failed: async ({ canvasElement }) => {
      await expect(within(canvasElement).getByText("Read unavailable")).toBeVisible();
    },
    Browser: async ({ canvasElement }) => {
      const page = within(canvasElement);
      await expect(page.getByText("Available only on an Android phone")).toBeVisible();
      await expect(page.queryByRole("button", { name: "Show identifiers" })).toBeNull();
    },
  },
};
