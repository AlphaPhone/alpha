// spec/app/settings/network.md, "Story: Join a nearby network"; spec/app/settings/network.md, "Story: See whether I am online"; spec/app/settings/carrier.md, "Story: Read what my carrier needs to activate a SIM"
import { SettingsCarrierPage, type SettingsCarrierField, type SettingsNearbyNetwork, type SettingsNetworkPageProps, SettingsNetworkPage, type SettingsNetworkSecurity } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import * as CarrierGen from "../../gen/app__settings__carrier.ts";
import { useMachine as useCarrier } from "../../gen/app__settings__carrier.react.ts";
import type { Machine as CarrierMachine } from "../../gen/app__settings__carrier.effect.vibe";
import type * as NetworkGen from "../../gen/app__settings__network.ts";
import { useMachine as useNetwork } from "../../gen/app__settings__network.react.ts";
import type { Machine as NetworkMachine } from "../../gen/app__settings__network.effect.vibe";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import type { Time } from "../runtime/time.vibe";
import { Found } from "./phone.vibe";
import type { Common } from "./Settings.tsx";

export interface PhoneProps {
  readonly runtime: ManagedRuntime.ManagedRuntime<NetworkMachine | CarrierMachine | Found | Time, unknown>;
  readonly common: Common;
}

const scans: Record<NetworkGen.Scan, SettingsNetworkPageProps["scan"]> = {
  NotScanned: "none", Found: "found", NeedsLocation: "needs-location", LocationOff: "location-off", ScanUnavailable: "unavailable",
};
const joins: Record<NetworkGen.Joined, SettingsNetworkPageProps["joined"]> = {
  NoJoin: undefined, Connected: "connected", Portal: "sign-in", Declined: "declined", Unverified: "unverified",
  NotConnected: "not-connected", WrongPassword: "wrong-password", AlreadySaved: "already-saved", JoinRefused: "refused",
};
const onlines: Record<NetworkGen.Online, SettingsNetworkPageProps["online"]> = {
  OnlineUnknown: "unknown", Offline: "offline", Validated: "online", BehindPortal: "sign-in", UnvalidatedOnline: "unconfirmed",
};
const securities: Record<NetworkGen.Security, SettingsNetworkSecurity> = {
  OpenNet: "open", EnhancedOpen: "enhanced-open", Wpa2: "wpa2", Wpa3: "wpa3", Enterprise: "enterprise", Wep: "wep",
};
const securitiesNamed = Object.fromEntries(Object.entries(securities).map(([security, name]) => [name, security])) as Record<SettingsNetworkSecurity, NetworkGen.Security>;

const printable = (text: string) => [...text].every((one) => one >= " " && one <= "~");

/** The join the rules are asked about, for the network chosen and the passphrase typed. */
const joining = (network: SettingsNearbyNetwork, passphrase: string) =>
  ({ type: "requestJoin", name: network.name, security: securitiesNamed[network.security], characters: passphrase.length, printable: printable(passphrase), passphrase, at: untimed }) as const;

/** Nearby networks, a join through Android's approval with a passphrase typed here and kept nowhere, and whether the phone is online. */
export function Network({ runtime, common }: PhoneProps) {
  const { state, can, send } = useTimed(runtime, useNetwork);
  if (!state) return null;
  const networks = state.scan === "Found" ? runtime.runSync(Found.use((found) => found.get())) : [];
  const rescan = { type: "rescan", at: untimed } as const;
  return (
    <SettingsNetworkPage
      {...common}
      online={onlines[state.online]}
      reading={state.reading.read.status === "Loading"}
      scan={scans[state.scan]}
      scanning={state.scanning.read.status === "Loading"}
      networks={networks.map((network) => ({ name: network.name, security: securities[network.security] }))}
      joined={joins[state.joined]}
      joining={state.joining.read.status === "Loading"}
      fits={(network, passphrase) => can(joining(network, passphrase))}
      onJoin={(network, passphrase) => void send(joining(network, passphrase))}
      onRescan={can(rescan) ? () => void send(rescan) : undefined}
    />
  );
}

const kinds: Record<CarrierGen.Kind, string> = {
  Imei: "IMEI", SimState: "SIM", Iccid: "ICCID", CarrierName: "Carrier", Operator: "Network", OperatorCode: "MCC/MNC", MobileData: "Mobile data",
  Roaming: "Roaming", Manufacturer: "Manufacturer", Model: "Model", DeviceName: "Device", AndroidVersion: "Android version", Baseband: "Baseband",
  SmsRole: "Default SMS app", PhoneRole: "Default phone app", ActiveSims: "Active SIMs", SimType: "SIM type", SimSlot: "SIM slot",
  SimName: "SIM name", DataState: "Data connection", NetworkType: "Data network", DefaultData: "Default data SIM",
};
const missing: Record<CarrierGen.Status, SettingsCarrierField["missing"]> = { Returned: undefined, AccessDenied: "access-denied", Missing: "unavailable", Unsupported: "unsupported", NotRead: "not-read" };

const simFields = new Set<CarrierGen.Kind>(["SimType", "SimSlot", "CarrierName", "SimName", "Iccid", "Operator", "OperatorCode", "MobileData", "DataState", "NetworkType", "Roaming", "DefaultData"]);
const deviceFields = new Set<CarrierGen.Kind>(["Manufacturer", "Model", "DeviceName", "AndroidVersion", "Baseband"]);
const named = (field: CarrierGen.Field) => field.kind === "Imei" || field.kind === "SimState" ? `${kinds[field.kind]} ${field.index + 1}` : kinds[field.kind];
const group = (field: CarrierGen.Field) => simFields.has(field.kind) ? `Active SIM ${field.index + 1}` : deviceFields.has(field.kind) ? "Device hardware" : undefined;

/** One identifier as the page shows it: what Android returned, or why it returned nothing. */
const shown = (field: CarrierGen.Field, name: string): SettingsCarrierField =>
  field.status === "Returned"
    ? { name, group: group(field), value: CarrierGen.shownValue(field), identifier: field.kind === "Imei" || field.kind === "Iccid" }
    : { name, group: group(field), missing: missing[field.status] };

/** The identifiers a carrier asks for, read only when the owner asks, and forgotten when the page goes. */
export function Carrier({ runtime, common }: PhoneProps) {
  const { state, can, send } = useTimed(runtime, useCarrier);
  if (!state) return null;
  const show = { type: "showIdentifiers", at: untimed } as const;
  const eid = { type: "askEid", at: untimed } as const;
  const copy = (value: string) => ({ type: "copyValue", value, at: untimed }) as const;
  const fields = [...state.fields.map((field) => shown(field, named(field))), ...(state.eid.status === "NotRead" ? [] : [shown(state.eid, "EID")])];
  return (
    <SettingsCarrierPage
      {...common}
      fields={fields}
      reading={state.read.read.status === "Loading" || state.eidRead.read.status === "Loading"}
      failed={state.read.read.status === "Failed"}
      smsChoice={CarrierGen.offersSmsChoice(state)}
      copied={state.copied === "CopiedIt" ? "copied" : state.copied === "CopyFailed" ? "failed" : undefined}
      onShow={can(show) ? () => void send(show) : undefined}
      onReadEid={can(eid) ? () => void send(eid) : undefined}
      copyable={(value) => can(copy(value))}
      onCopy={(value) => void send(copy(value))}
    />
  );
}
