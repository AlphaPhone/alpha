// spec/settings/carrier.md, "Story: Read what my carrier needs to activate a SIM"
import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { CarrierPageProps } from "./CarrierPage.tsx";
import { carrierActive, carrierFailed, carrierIdle, carrierNoSim } from "./fixtures.ts";

export const meta: ComponentMeta<CarrierPageProps> = {
  args: { carrier: carrierIdle, acts: { read: fn(), readEid: fn(), copy: fn(), openPage: fn() } },
  examples: {
    NoSim: { carrier: carrierNoSim },
    ActiveSim: { carrier: carrierActive },
    Reading: { carrier: { ...carrierIdle, epoch: 2, phase: "CarrierReading" } },
    Failed: { carrier: carrierFailed },
  },
  play: {
    Default: async ({ canvasElement, args }) => {
      const page = within(canvasElement);
      await expect(page.queryByText("123456789012345")).toBeNull();
      await userEvent.click(page.getByRole("button", { name: "Show identifiers" }));
      await expect(args.acts.read).toHaveBeenCalled();
    },
    NoSim: async ({ canvasElement, args }) => {
      const page = within(canvasElement);
      await expect(page.getByText("Access denied by Android")).toBeVisible();
      await expect(page.getByText("None reported")).toBeVisible();
      await userEvent.click(page.getByRole("button", { name: "Copy IMEI 1" }));
      await expect(args.acts.copy).toHaveBeenCalledWith({ kind: "ImeiTarget", index: 0 });
      await userEvent.click(page.getByRole("button", { name: "Read EID (optional)" }));
      await expect(args.acts.readEid).toHaveBeenCalled();
    },
    ActiveSim: async ({ canvasElement, args }) => {
      const page = within(canvasElement);
      await expect(page.getByText("Copied")).toBeVisible();
      await expect(page.getByRole("button", { name: "Copy IMEI 1, copied" })).toBeVisible();
      await expect(page.getByText("Alpha Phone")).toBeVisible();
      await expect(page.getByRole("button", { name: "Copy ICCID" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Copy EID" })).toBeVisible();
      await userEvent.click(page.getByRole("button", { name: "Choose the default SMS app in Android" }));
      await expect(args.acts.openPage).toHaveBeenCalledWith("PageDefaultApps");
    },
  },
};
