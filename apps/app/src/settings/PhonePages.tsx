// spec/app/settings/network.md, "Story: Join a nearby network"; spec/app/settings/carrier.md, "Story: Read what my carrier needs to activate a SIM"; spec/app/settings/passwords.md, "Story: Use my saved passwords only after Android unlocks them"
import { Alert, Button, ConfirmDialog, Input, ListGroup, ListRow, Spinner } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { useState } from "react";
import * as CarrierGen from "../../gen/app__settings__carrier.ts";
import { useMachine as useCarrier } from "../../gen/app__settings__carrier.react.ts";
import type { Machine as CarrierMachine } from "../../gen/app__settings__carrier.effect.vibe";
import * as NetworkGen from "../../gen/app__settings__network.ts";
import { useMachine as useNetwork } from "../../gen/app__settings__network.react.ts";
import type { Machine as NetworkMachine } from "../../gen/app__settings__network.effect.vibe";
import type { Entry, Reason } from "../../gen/app__settings__passwords.ts";
import { useMachine as useVault } from "../../gen/app__settings__passwords.react.ts";
import type { Machine as VaultMachine } from "../../gen/app__settings__passwords.effect.vibe";
import type { Nearby } from "../platform/wifi.vibe";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import type { Time } from "../runtime/time.vibe";
import { Found } from "./phone.vibe";

export interface PhoneProps {
  runtime: ManagedRuntime.ManagedRuntime<NetworkMachine | CarrierMachine | VaultMachine | Found | Time, unknown>;
}

const scans: Partial<Record<NetworkGen.Scan, string>> = { NeedsLocation: "Scanning needs precise location", LocationOff: "Turn on Location to scan", ScanUnavailable: "The phone couldn't scan" };
const joins: Partial<Record<NetworkGen.Joined, string>> = {
  Connected: "Connected", Portal: "Connected; the network needs a sign-in page", Declined: "Not saved", Unverified: "Alpha can't tell whether it connected",
  NotConnected: "Saved, but not connected", WrongPassword: "Wrong password", AlreadySaved: "Already saved: choose it in Android's Internet panel", JoinRefused: "Android wouldn't join it",
};
const onlines: Record<NetworkGen.Online, string> = { OnlineUnknown: "Unknown", Offline: "Offline", Validated: "Online", BehindPortal: "Needs a sign-in page", UnvalidatedOnline: "Connected, Internet unconfirmed" };
const securities: Record<NetworkGen.Security, string> = { OpenNet: "Open", EnhancedOpen: "Enhanced Open", Wpa2: "WPA2", Wpa3: "WPA3", Enterprise: "Enterprise", Wep: "WEP" };

const printable = (text: string) => [...text].every((one) => one >= " " && one <= "~");

/** Nearby networks, a join through Android's approval with a passphrase typed here and kept nowhere, and whether the phone is online. */
export function Network({ runtime }: PhoneProps) {
  const { state, can, send } = useTimed(runtime, useNetwork);
  const [chosen, choose] = useState<Nearby | undefined>(undefined);
  const [passphrase, setPassphrase] = useState("");
  if (!state) return null;
  const networks = state.scan === "Found" ? runtime.runSync(Found.use((found) => found.get())) : [];
  const said = scans[state.scan];
  const joined = joins[state.joined];
  const join = chosen && { type: "requestJoin", name: chosen.name, security: chosen.security, characters: passphrase.length, printable: printable(passphrase), passphrase, at: untimed } as const;
  return (
    <>
      <ListGroup>
        <ListRow title="Internet" trailing={state.reading.read.status === "Loading" ? <Spinner size="sm" label="Reading" /> : onlines[state.online]} />
      </ListGroup>
      {said !== undefined && <Alert variant="warn">{said}</Alert>}
      {joined !== undefined && <Alert variant={state.joined === "Connected" ? "ok" : "warn"}>{joined}</Alert>}
      <ListGroup heading="Nearby">
        {state.scanning.read.status === "Loading" && <Spinner label="Scanning" />}
        {networks.map((network) => <ListRow key={network.name} aria-label={network.name} title={network.name} detail={securities[network.security]} selected={chosen?.name === network.name} onClick={() => { choose(network); setPassphrase(""); }} />)}
      </ListGroup>
      {chosen && (
        <form className="flex flex-col gap-2 px-4" onSubmit={(event) => {
          event.preventDefault();
          if (join === undefined || !can(join)) return;
          void send(join);
          setPassphrase("");
          choose(undefined);
        }}>
          {chosen.security !== "OpenNet" && chosen.security !== "EnhancedOpen" && <Input type="password" autoComplete="off" aria-label={`Password for ${chosen.name}`} value={passphrase} onChange={(event) => setPassphrase(event.target.value)} />}
          {!NetworkGen.fits(chosen.security, chosen.security === "Enterprise" || chosen.security === "Wep" ? 0 : 8, true) && <Alert variant="warn">Join this network in Android's Wi-Fi settings</Alert>}
          <Button type="submit" disabled={join === undefined || !can(join)}>{`Join ${chosen.name}`}</Button>
        </form>
      )}
      {can({ type: "rescan", at: untimed }) && <Button variant="outline" onClick={() => void send({ type: "rescan", at: untimed })}>Scan again</Button>}
    </>
  );
}

const kinds: Record<CarrierGen.Kind, string> = {
  Imei: "IMEI", SimState: "SIM", Iccid: "ICCID", CarrierName: "Carrier", Operator: "Network", OperatorCode: "MCC/MNC", MobileData: "Mobile data",
  Roaming: "Roaming", Manufacturer: "Manufacturer", Model: "Model", Baseband: "Baseband", SmsRole: "SMS app", PhoneRole: "Phone app",
};
const statusWords: Record<CarrierGen.Status, string> = { Returned: "", AccessDenied: "Access denied by Android", Missing: "Unavailable from Android", Unsupported: "Not supported on this phone", NotRead: "Not read" };

function Identifier({ runtime, field, label }: PhoneProps & { field: CarrierGen.Field; label: string }) {
  const { can, send } = useTimed(runtime, useCarrier);
  const value = CarrierGen.shownValue(field);
  const copy = { type: "copyValue", value, at: untimed } as const;
  return <ListRow title={label} detail={value === "" ? statusWords[field.status] : value} trailing={can(copy) ? <Button size="sm" variant="ghost" aria-label={`Copy ${label}`} onClick={() => void send(copy)}>Copy</Button> : undefined} />;
}

/** The identifiers a carrier asks for, read only when the owner asks, and forgotten when the page goes. */
export function Carrier({ runtime }: PhoneProps) {
  const { state, can, send } = useTimed(runtime, useCarrier);
  if (!state) return null;
  const show = { type: "showIdentifiers", at: untimed } as const;
  const eid = { type: "askEid", at: untimed } as const;
  const numbered = (field: CarrierGen.Field) => (field.kind === "Imei" || field.kind === "SimState" ? `${kinds[field.kind]} ${field.index + 1}` : kinds[field.kind]);
  return (
    <>
      {state.read.read.status === "Failed" && <Alert variant="warn">The identifiers couldn't be read</Alert>}
      {state.copied !== "NotCopied" && <Alert variant={state.copied === "CopiedIt" ? "ok" : "warn"}>{state.copied === "CopiedIt" ? "Copied" : "Couldn't copy"}</Alert>}
      {state.read.read.status === "Loading" && <Spinner label="Reading identifiers" />}
      {state.fields.length > 0 && (
        <ListGroup>
          {state.fields.map((field) => <Identifier key={`${field.kind} ${field.index}`} runtime={runtime} field={field} label={numbered(field)} />)}
          {state.eid.status !== "NotRead" && <Identifier runtime={runtime} field={state.eid} label="EID" />}
        </ListGroup>
      )}
      <div className="flex flex-wrap gap-2 px-4">
        {can(show) && <Button onClick={() => void send(show)}>Show identifiers</Button>}
        {can(eid) && <Button variant="outline" onClick={() => void send(eid)}>Read EID</Button>}
      </div>
    </>
  );
}

const reasons: Record<Reason, string> = {
  NoReason: "", NoScreenLock: "Set a screen lock to use passwords", Unsupported: "This phone can't keep passwords", NotAdmitted: "Passwords aren't available to Alpha",
  DeviceLocked: "Unlock the phone first", LegacyAuthorization: "Unlock once with your screen lock", LegacyKey: "The saved key is unavailable", BridgeMissing: "Passwords aren't available here",
};

/** The vault: unlocked only by Android, its entries by name alone, each shown or copied by Android, removed after a second tap. */
export function Passwords({ runtime }: PhoneProps) {
  const { state, can, send } = useTimed(runtime, useVault);
  if (!state) return null;
  const task = (task: "Unlocking" | "Editing" | "Revealing" | "Copying" | "Removing" | "Resetting" | "OpeningAutofill", id = "") => ({ type: "beginTask", task, id }) as const;
  const open: Entry | undefined = state.entries.find((entry) => entry.id === state.selected);
  return (
    <>
      {state.phase === "Checking" && <Spinner label="Opening the vault" />}
      {state.phase === "VaultUnavailable" && <Alert variant="warn">{reasons[state.reason]}</Alert>}
      {state.phase === "Damaged" && <Alert variant="destructive">Android can no longer open the vault</Alert>}
      {can(task("Unlocking")) && <Button onClick={() => void send(task("Unlocking"))}>Unlock</Button>}
      {can({ type: "askReset" }) && <Button variant="destructive" onClick={() => void send({ type: "askReset" })}>Reset vault</Button>}
      {open === undefined
        ? (
          <ListGroup>
            {state.entries.map((entry) => <ListRow key={entry.id} aria-label={entry.label} title={entry.label} detail={entry.username} onClick={() => void send({ type: "openEntry", id: entry.id })} />)}
          </ListGroup>
        )
        : (
          <ListGroup heading={open.label}>
            <ListRow title={open.username} detail={open.sites.join(", ")} />
            <div className="flex flex-wrap gap-2 p-4">
              {can(task("Revealing", open.id)) && <Button variant="outline" onClick={() => void send(task("Revealing", open.id))}>Show</Button>}
              {can(task("Copying", open.id)) && <Button variant="outline" onClick={() => void send(task("Copying", open.id))}>Copy</Button>}
              {can(task("Editing", open.id)) && <Button variant="outline" onClick={() => void send(task("Editing", open.id))}>Edit</Button>}
              {can({ type: "askRemove", id: open.id }) && <Button variant="outline" onClick={() => void send({ type: "askRemove", id: open.id })}>Delete</Button>}
              {can({ type: "closeEntry" }) && <Button variant="ghost" onClick={() => void send({ type: "closeEntry" })}>Close</Button>}
            </div>
          </ListGroup>
        )}
      {can(task("Editing")) && open === undefined && <Button variant="outline" onClick={() => void send(task("Editing"))}>Add password</Button>}
      {can(task("OpeningAutofill")) && <Button variant="outline" onClick={() => void send(task("OpeningAutofill"))}>Use Alpha for autofill</Button>}
      <ConfirmDialog open={state.confirmRemove !== ""} title="Delete this password?" confirmLabel="Delete" destructive loading={state.task === "Removing"} onConfirm={() => void send(task("Removing", state.confirmRemove))} onCancel={() => void send({ type: "cancelConfirm" })} />
      <ConfirmDialog open={state.confirmReset} title="Reset the vault?" confirmLabel="Reset" destructive loading={state.task === "Resetting"} onConfirm={() => void send(task("Resetting"))} onCancel={() => void send({ type: "cancelConfirm" })}>
        Every saved password is erased.
      </ConfirmDialog>
    </>
  );
}
