// spec/settings/carrier.md, "Story: Get my phone ready for a carrier's SIM"; spec/settings/carrier.md, "Opening the page reads nothing; Show identifiers reads once, and only the latest read answers"; spec/settings/carrier.md, "The EID is a separate, optional read that never holds up the IMEI read"; spec/settings/carrier.md, "Only a value Android returned can be copied, one identifier at a time"; spec/settings/carrier.md, "Android's own screens are a tap away, at fixed destinations"
import { Copy, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import type { CarrierScreen, CarrierSetup, Copyable, Fact, FactStatus, Hardware } from "../../../gen/settings__carrier.ts";
import { ListRow, Spinner } from "../components/ui/index.ts";
import { Section } from "./Rows.tsx";

/** Why Android withheld a fact, in the page's words; an available fact shows its value instead. */
export const WITHHELD: Record<FactStatus, string> = {
  Available: "Unavailable from Android", Denied: "Access denied by Android", Unsupported: "Not supported on this device",
  Unreadable: "Unavailable from Android", NotRead: "Not read",
};

/** A fact as the page shows it: Android's value, or why there is none. */
export function factText(fact: Fact): string {
  return fact.status === "Available" && fact.value.trim() !== "" ? fact.value : WITHHELD[fact.status];
}

const HARDWARE: ReadonlyArray<readonly [keyof Hardware, string]> = [
  ["manufacturer", "Manufacturer"], ["model", "Model"], ["device", "Device"], ["android", "Android version"], ["baseband", "Baseband"],
];

export interface CarrierSetupViewProps {
  /** What the latest read returned, held only while the page is in front. */
  readonly setup: CarrierSetup;
  /** On an Android phone; a browser has no identifiers to read. */
  readonly native: boolean;
  /** The answer of the last copy or Android handoff, if any. */
  readonly notice: string;
  /** Show identifiers, or Refresh identifiers. */
  readonly onShow: () => void;
  /** Read eSIM EID (optional). */
  readonly onShowEid: () => void;
  /** Copy one identifier; `label` names it in the notice. */
  readonly onCopy: (what: Copyable, label: string) => void;
  /** Open one of Android's own screens. */
  readonly onOpenScreen: (screen: CarrierScreen) => void;
}

function Info({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex min-h-12 items-baseline justify-between gap-4 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-sm break-words">{value}</span>
    </div>
  );
}

function Note({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return (
    <div className="px-4 py-3">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function Action({ label, busy, onClick, external }: { readonly label: string; readonly busy?: boolean; readonly onClick: () => void; readonly external?: boolean }) {
  return (
    <ListRow title={label} aria-busy={busy || undefined} disabled={busy} onClick={onClick}
      trailing={busy ? <Spinner size="sm" aria-hidden /> : external ? <ExternalLink aria-hidden className="size-4" /> : undefined} />
  );
}

/** An identifier Android returned is a Copy button named for it; one it withheld says why. */
function Identifier({ label, fact, what, onCopy }: { readonly label: string; readonly fact: Fact; readonly what: Copyable; readonly onCopy: CarrierSetupViewProps["onCopy"] }) {
  if (fact.status !== "Available" || fact.value.trim() === "") return <Info label={label} value={factText(fact)} />;
  return (
    <ListRow title={label} detail={<span className="font-mono">{fact.value}</span>} aria-label={`Copy ${label}`}
      trailing={<span className="inline-flex items-center gap-1"><Copy aria-hidden className="size-4" />Copy</span>} onClick={() => onCopy(what, label)} />
  );
}

/**
 * Settings → General → Carrier & SIM setup: the IMEI of each modem slot, SIM state, active SIMs, default apps, hardware and the
 * optional EID, read only when the owner asks and forgotten on leaving; and Android's own About phone, SIM, network and APN screens.
 * @model spec/settings/carrier.md
 * @design design.md
 */
export function CarrierSetupView({ setup, native, notice, onShow, onShowEid, onCopy, onOpenScreen }: CarrierSetupViewProps) {
  const reading = setup.reading;
  const shown = setup.phase === "CarrierShown";
  const busy = setup.phase === "CarrierReading";
  return (
    <>
      {notice && <p role="status" aria-live="polite" className="px-4 text-sm text-muted-foreground">{notice}</p>}
      <Section>
        {native
          ? <Action label={busy ? "Reading identifiers…" : shown ? "Refresh identifiers" : "Show identifiers"} busy={busy} onClick={onShow} />
          : <Info label="Device identifiers" value="Available only on an Android phone" />}
        <Note title="Private device information">Read only when you tap above. Values clear when you leave this page. Copy uses the Android clipboard.</Note>
        {setup.phase === "CarrierFailed" && (
          <Note title="Read unavailable">Keep Alpha in front and the phone unlocked, then try again. You can also use Android device identifiers below.</Note>
        )}
      </Section>
      {shown && (
        <>
          <Section>
            {reading.slots.length === 0 && <Info label="IMEI" value="No modem slot was reported by Android" />}
            {reading.slots.map((slot) => (
              <div key={slot.slot}>
                <Identifier label={`IMEI ${slot.slot + 1}`} fact={slot.imei} what={{ tag: "CopyImei", slot: slot.slot }} onCopy={onCopy} />
                <Info label={`SIM state · slot ${slot.slot + 1}`} value={factText(slot.simState)} />
              </div>
            ))}
          </Section>
          <Section>
            <Info label="Default SMS app" value={factText(reading.smsRole)} />
            <Info label="Default phone app" value={factText(reading.dialerRole)} />
            <Note title="Identifier access">If Android denies access, use Android device identifiers below. After choosing a default SMS app, tap Refresh identifiers.</Note>
            {reading.canChooseSms && <Action label="Choose default SMS app in Android" external onClick={() => onOpenScreen("ScreenDefaultSms")} />}
            {!reading.aospImage && (
              <Note title="Phone integration">Carrier activation remains a system task. Alpha Phone, Contacts and Messages require the admitted Alpha system image.</Note>
            )}
          </Section>
          {reading.sims !== "Available" && <Section><Info label="Active SIMs" value={WITHHELD[reading.sims]} /></Section>}
          {reading.sims === "Available" && reading.active.length === 0 && (
            <Section>
              <Info label="Active SIMs" value="No active subscription reported" />
              <Note title="Not activated yet?">Insert the carrier’s physical SIM and complete its activation. A detected SIM or displayed IMEI does not confirm carrier compatibility or service.</Note>
            </Section>
          )}
          {reading.sims === "Available" && reading.active.map((sim) => (
            <Section key={sim.subscription} caption={`Active SIM · subscription ${sim.subscription}`}>
              <Info label="SIM type" value={sim.embedded ? "eSIM" : "Physical SIM"} />
              <Info label="SIM slot" value={sim.slot >= 0 ? String(sim.slot + 1) : "Not reported"} />
              <Info label="Carrier" value={factText(sim.carrier)} />
              <Info label="SIM name" value={factText(sim.simName)} />
              <Identifier label="ICCID" fact={sim.iccid} what={{ tag: "CopyIccid", subscription: sim.subscription }} onCopy={onCopy} />
              <Info label="Network operator" value={factText(sim.operator)} />
              <Info label="Operator code (MCC/MNC)" value={factText(sim.operatorCode)} />
              <Info label="Mobile data setting" value={factText(sim.dataEnabled)} />
              <Info label="Data connection" value={factText(sim.dataState)} />
              <Info label="Data network" value={factText(sim.networkType)} />
              <Info label="Roaming" value={factText(sim.roaming)} />
              <Info label="Default data SIM" value={sim.defaultData ? "Yes" : "No"} />
            </Section>
          ))}
          <Section>
            <Identifier label="EID (eSIM)" fact={reading.eid} what={{ tag: "CopyEid" }} onCopy={onCopy} />
            {reading.eid.status !== "Unsupported" && (
              <Action label={setup.eidReading ? "Reading eSIM EID…" : "Read eSIM EID (optional)"} busy={setup.eidReading} onClick={onShowEid} />
            )}
          </Section>
          <Section caption="Device hardware">
            {HARDWARE.map(([key, label]) => <Info key={key} label={label} value={factText(reading.hardware[key])} />)}
          </Section>
        </>
      )}
      <Section>
        <Note title="Activate a physical SIM">For T-Mobile Connect with a new number, choose Bring your own phone, a physical SIM and a new number with the carrier. Check compatibility using the actual IMEI before ordering.</Note>
        <Note title="Before inserting a SIM">IMEI identifies the phone and can be read before a SIM is installed. ICCID identifies the SIM and may be printed on its card. EID is for eSIM and is optional for a physical SIM.</Note>
      </Section>
      {native && (
        <Section>
          <Action label="Android device identifiers / About phone" external onClick={() => onOpenScreen("ScreenIdentifiers")} />
          <Note title="If IMEI access is denied">In Android About phone, open IMEI or device identifiers. You can also check the original phone box. On a supported system Phone dial pad, *#06# may show identifiers; Alpha does not simulate this code.</Note>
          <Action label="Android SIM settings" external onClick={() => onOpenScreen("ScreenSims")} />
          <Action label="Android mobile network settings" external onClick={() => onOpenScreen("ScreenMobile")} />
          <Action label="Android access point names (APN)" external onClick={() => onOpenScreen("ScreenApn")} />
          <Note title="After activation">Refresh identifiers and confirm the SIM and network state. Test calls, SMS and mobile data with Wi-Fi off. Use APN values supplied by T-Mobile; this page does not change your plan, SIM, network or APN.</Note>
        </Section>
      )}
    </>
  );
}
