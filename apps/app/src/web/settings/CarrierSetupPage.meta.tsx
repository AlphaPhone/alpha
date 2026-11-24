// spec/settings/carrier.md, "Story: Read carrier activation details only when I ask"
import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { CarrierField, CarrierSetup } from "../../settings/native.schema.vibe";
import type { CarrierSetupPageProps } from "./CarrierSetupPage.tsx";

const shown = (value: string): CarrierField => ({ status: "available", value });
const denied = { status: "permission-denied" } as const;
const data: CarrierSetup = {
  status: "ready", aospImage: true, canChooseSms: false, smsRole: shown("Alpha Phone is the default SMS app"),
  dialerRole: shown("Alpha Phone is the default phone app"), modemCount: shown("2"), eid: { status: "not-read" },
  hardware: { manufacturer: shown("Fixture"), model: shown("Demo"), device: shown("Demo"), android: shown("17"), baseband: denied },
  slots: [
    { slotIndex: 0, imei: shown("000000000000001"), simState: shown("No SIM") },
    { slotIndex: 1, imei: denied, simState: shown("No SIM") },
  ],
  subscriptions: { status: "available", items: [] },
};

export const meta: ComponentMeta<CarrierSetupPageProps> = {
  args: { available: true, busy: false, eidBusy: false, failed: false, notice: "", show: fn(), showEid: fn(), copy: fn(), open: fn() },
  examples: { Shown: { data }, Browser: { available: false }, Failed: { failed: true }, Reading: { busy: true } },
  play: {
    Default: async ({ canvasElement, args }) => {
      const page = within(canvasElement);
      await expect(page.queryByRole("button", { name: "Copy IMEI 1" })).toBeNull();
      await userEvent.click(page.getByRole("button", { name: "Show identifiers" }));
      await expect(args.show).toHaveBeenCalledOnce();
    },
    Shown: async ({ canvasElement, args }) => {
      const page = within(canvasElement);
      await expect(page.getByText("No active subscription reported")).toBeVisible();
      await expect(page.queryByRole("button", { name: "Copy IMEI 2" })).toBeNull();
      await userEvent.click(page.getByRole("button", { name: "Copy IMEI 1" }));
      await expect(args.copy).toHaveBeenCalledWith("imei-0");
      await userEvent.click(page.getByRole("button", { name: "Read eSIM EID (optional)" }));
      await expect(args.showEid).toHaveBeenCalledOnce();
    },
  },
};
