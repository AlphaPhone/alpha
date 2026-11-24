// spec/settings/carrier.md, "Story: Give my carrier the identifiers it asks for, and keep them nowhere else"
import type { ComponentMeta } from "vibestack/stories";
import { initial } from "../../../gen/settings__carrier.ts";
import type { CarrierSetupPageProps } from "./CarrierSetupPage.tsx";

const none = () => undefined;
const shownState = { ...initial, current: true, read: "ReadShown" as const, generation: 1, reads: 1 };
const read = {
  status: "ready" as const,
  slots: [
    { slotIndex: 0, imei: { status: "available" as const, value: "356938035643809" }, simState: { status: "available" as const, value: "Ready" } },
    { slotIndex: 1, imei: { status: "permission-denied" as const }, simState: { status: "available" as const, value: "No SIM" } },
  ],
  subscriptions: { status: "available" as const, items: [{
    subscriptionId: 1, slotIndex: 0, embedded: false, carrier: { status: "available" as const, value: "Fixture Mobile" },
    iccid: { status: "available" as const, value: "8901260000000000001" }, operator: { status: "available" as const, value: "Fixture Mobile" },
    networkType: { status: "available" as const, value: "LTE" },
  }] },
};

export const meta: ComponentMeta<CarrierSetupPageProps> = {
  args: { view: { state: { ...initial, current: true } }, native: true, onShow: none, onShowEid: none, onCopy: none, onAndroid: none },
  states: {
    Reading: { view: { state: { ...initial, current: true, read: "Reading", generation: 1, reads: 1 } } },
    Shown: { view: { state: shownState, read } },
    EidShown: { view: { state: { ...shownState, eid: "EidShown" }, read, eid: { status: "unsupported" } } },
    Failed: { view: { state: { ...initial, current: true, read: "ReadFailed", generation: 1, reads: 1 } } },
    Browser: { native: false },
  },
};
