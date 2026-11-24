// spec/settings/carrier.md, "Story: Give my carrier the identifiers it asks for, and keep them nowhere else"
import { Copy } from "lucide-react";
import type { CarrierPage, CarrierView } from "../../settings/carrier.vibe";
import { carrierFieldText, carrierIdentifier } from "../../settings/carrier.vibe";
import { Button } from "../components/ui/index.ts";
import { Section, SettingRow } from "./Rows.tsx";

export type CarrierSetupPageProps = {
  /** What the page read, only while it shows; nothing until the owner asks. */
  view: CarrierView;
  /** This build has a phone to read: the browser build offers no read. */
  native: boolean;
  onShow: () => void;
  onShowEid: () => void;
  onCopy: (token: string) => void;
  onAndroid: (page: CarrierPage) => void;
};

function Fact({ label, text, token, view, onCopy }: { label: string; text: string; token?: string; view: CarrierView; onCopy: (token: string) => void }) {
  const copyable = token !== undefined && carrierIdentifier(view, token) !== undefined;
  return (
    <div className="flex min-h-12 items-center gap-2 px-4 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="break-all tabular-nums">{text}</p>
      </div>
      {copyable && <Button variant="ghost" size="icon" aria-label={`Copy ${label}`} onClick={() => onCopy(token)}><Copy aria-hidden /></Button>}
    </div>
  );
}

/**
 * Carrier & SIM setup: the identifiers a carrier asks for, read only when the owner taps Show identifiers and forgotten when the page leaves the front.
 * @model spec/settings/carrier.md
 */
export function CarrierSetupPage({ view, native, onShow, onShowEid, onCopy, onAndroid }: CarrierSetupPageProps) {
  const { state, read, eid } = view;
  const reading = state.read === "Reading";
  return (
    <>
      <Section caption="Identifiers">
        <p className="px-4 py-2 text-sm text-muted-foreground">
          Your carrier may ask for these to activate a SIM. They are read only when you ask, stay on this screen, and are forgotten when you leave it.
        </p>
        {native
          ? <SettingRow label={reading ? "Reading identifiers…" : read !== undefined ? "Refresh identifiers" : "Show identifiers"} busy={reading} disabled={reading} onOpen={onShow} />
          : <SettingRow label="Device identifiers" state={{ word: "Available only on an Android phone" }} />}
        {state.read === "ReadFailed" && <p role="status" className="px-4 py-2 text-sm text-muted-foreground">Android didn’t give the identifiers. Try again.</p>}
        {read?.slots.map((slot) => (
          <div key={`slot-${slot.slotIndex}`}>
            <Fact label={`IMEI (slot ${slot.slotIndex + 1})`} text={carrierFieldText(slot.imei)} token={`imei-${slot.slotIndex}`} view={view} onCopy={onCopy} />
            <Fact label={`SIM (slot ${slot.slotIndex + 1})`} text={carrierFieldText(slot.simState)} view={view} onCopy={onCopy} />
          </div>
        ))}
        {read?.subscriptions.items.map((sub) => (
          <div key={`sub-${sub.subscriptionId}`}>
            <Fact label={`ICCID (${carrierFieldText(sub.carrier)}${sub.embedded ? ", eSIM" : ""})`} text={carrierFieldText(sub.iccid)} token={`iccid-${sub.subscriptionId}`} view={view} onCopy={onCopy} />
            <Fact label="Network" text={`${carrierFieldText(sub.operator)} · ${carrierFieldText(sub.networkType)}`} view={view} onCopy={onCopy} />
          </div>
        ))}
        {read !== undefined && read.subscriptions.status !== "available" && <Fact label="SIM subscriptions" text={carrierFieldText({ status: read.subscriptions.status })} view={view} onCopy={onCopy} />}
        {read !== undefined && (eid === undefined
          ? <SettingRow label={state.eid === "EidReading" ? "Reading eSIM EID…" : "Read eSIM EID (optional)"} busy={state.eid === "EidReading"} disabled={state.eid === "EidReading"} onOpen={onShowEid} />
          : <Fact label="eSIM EID" text={carrierFieldText(eid)} token="eid" view={view} onCopy={onCopy} />)}
      </Section>
      {native && (
        <Section caption="Android settings">
          <SettingRow label="About phone" onHandoff={() => onAndroid("identifiers")} ariaLabel="About phone, opens Android settings" />
          <SettingRow label="SIMs" onHandoff={() => onAndroid("sim")} ariaLabel="SIMs, opens Android settings" />
          <SettingRow label="Mobile network" onHandoff={() => onAndroid("mobile")} ariaLabel="Mobile network, opens Android settings" />
          <SettingRow label="Access point names" onHandoff={() => onAndroid("apn")} ariaLabel="Access point names, opens Android settings" />
        </Section>
      )}
    </>
  );
}
