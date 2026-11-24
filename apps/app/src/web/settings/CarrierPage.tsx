// spec/settings/carrier.md, "Story: Read what my carrier needs to activate a SIM"; spec/settings/carrier.md, "Each field shows what Android returned, or why it returned nothing"; spec/settings/carrier.md, "The EID is its own optional read, after the identifiers, and never delays them"; spec/settings/carrier.md, "Copy puts one identifier Android returned on the Android clipboard"; spec/settings/carrier.md, "General offers the page on the phone only, and the default SMS app choice only where Alpha can take it"
import { Antenna, CardSim, Copy, Fingerprint, RotateCw, Signal } from "lucide-react";
import type { Carrier, CopyTarget, Field, FieldStatus, Sim } from "../../../gen/settings__carrier.ts";
import { copyable, fieldAt, returnedValue, smsChoiceOffered } from "../../../gen/settings__carrier.ts";
import type { SettingsPage } from "../../../gen/settings__facts.ts";
import { ListRow, Spinner } from "../components/ui/index.ts";
import { Section, SettingRow } from "./Rows.tsx";
import { ROLE } from "./words.ts";

const WHY: Record<FieldStatus, string> = {
  Returned: "", AccessDenied: "Access denied by Android", Missing: "Unavailable from Android", Unsupported: "Not supported on this phone", NotRead: "Not read",
};

/** A field's words: Android's value, or why it returned none. */
export function fieldText(field: Field): string {
  return returnedValue(field) || WHY[field.status === "Returned" ? "Missing" : field.status];
}

/** What the owner can do on Carrier & SIM setup. */
export interface CarrierActs {
  /** Show or refresh the identifiers: one read of everything but the EID. */
  readonly read: () => void;
  /** The optional EID read. */
  readonly readEid: () => void;
  /** Copy one shown identifier to the Android clipboard. */
  readonly copy: (target: CopyTarget) => void;
  /** Android's own page for what Android owns. */
  readonly openPage: (page: SettingsPage) => void;
}

export interface CarrierPageProps {
  /** What the page read while it is in front; nothing before Show identifiers. */
  readonly carrier: Carrier;
  readonly acts: CarrierActs;
}

function Fact({ label, text }: { readonly label: string; readonly text: string }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 px-4 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right break-words">{text}</span>
    </div>
  );
}

function Note({ title, children }: { readonly title?: string; readonly children: string }) {
  return (
    <p className="px-4 py-3 text-sm text-muted-foreground">
      {title && <span className="block text-foreground">{title}</span>}
      {children}
    </p>
  );
}

/** An identifier: copied from the row where Android returned it, otherwise why it did not. */
function Identifier({ label, carrier, target, acts }: { readonly label: string; readonly carrier: Carrier; readonly target: CopyTarget; readonly acts: CarrierActs }) {
  const value = copyable(carrier, target);
  if (value === "") return <Fact label={label} text={fieldText(fieldAt(carrier, target))} />;
  const marked = carrier.copy.target.kind === target.kind && carrier.copy.target.index === target.index;
  const mark = !marked ? "Copy" : carrier.copy.copied ? "Copied" : "Not copied";
  return (
    <ListRow title={label} detail={<span className="font-mono">{value}</span>} aria-label={`Copy ${label}`}
      trailing={<span className="inline-flex items-center gap-2"><Copy aria-hidden className="size-4" />{mark}</span>} onClick={() => acts.copy(target)} />
  );
}

function SimSection({ sim, carrier, acts }: { readonly sim: Sim; readonly carrier: Carrier; readonly acts: CarrierActs }) {
  const where = sim.slot >= 0 ? `Slot ${sim.slot + 1}` : "Slot not reported";
  return (
    <Section caption={`${sim.embedded ? "eSIM" : "Physical SIM"} · ${where}`}>
      <Fact label="Carrier" text={fieldText(sim.carrier)} />
      <Fact label="SIM name" text={fieldText(sim.simName)} />
      <Identifier label="ICCID" carrier={carrier} target={{ kind: "IccidTarget", index: sim.subscription }} acts={acts} />
      <Fact label="Network operator" text={fieldText(sim.operator)} />
      <Fact label="Operator code (MCC/MNC)" text={fieldText(sim.operatorCode)} />
      <Fact label="Mobile data" text={fieldText(sim.dataEnabled)} />
      <Fact label="Data connection" text={fieldText(sim.dataState)} />
      <Fact label="Data network" text={fieldText(sim.networkType)} />
      <Fact label="Roaming" text={fieldText(sim.roaming)} />
      <Fact label="Default for data" text={sim.defaultData ? "Yes" : "No"} />
    </Section>
  );
}

/**
 * Settings → General → Carrier & SIM setup: on Show identifiers, the IMEI and SIM state of each modem slot, each active SIM's
 * carrier, ICCID and network, the default SMS and phone apps, the EID on its own request, the hardware, and Android's own
 * pages. Values are held only while the page is in front and are never stored or given to Alpha.
 * @model spec/settings/carrier.md
 * @design design.md
 */
export function CarrierPage({ carrier, acts }: CarrierPageProps) {
  const { setup, phase } = carrier;
  const reading = phase === "CarrierReading";
  const shown = phase === "CarrierShown";
  return (
    <>
      <Section>
        <SettingRow label={reading ? "Reading identifiers" : shown ? "Refresh identifiers" : "Show identifiers"} busy={reading}
          icon={<RotateCw aria-hidden className="size-5" />} onOpen={acts.read} />
        <Note title="Private device information">Read only when you tap above. Cleared when you leave this page. Copy uses the Android clipboard.</Note>
        {phase === "CarrierFailed" && (
          <p role="status" className="px-4 pb-3 text-sm text-muted-foreground">Couldn’t read. Keep Alpha in front and the phone unlocked, then try again, or use About phone below.</p>
        )}
      </Section>
      {shown && (
        <>
          <Section caption="Device identifiers">
            {setup.slots.length === 0 && <Fact label="IMEI" text="No modem slot reported by Android" />}
            {setup.slots.map((slot) => (
              <div key={slot.slot}>
                <Identifier label={`IMEI ${slot.slot + 1}`} carrier={carrier} target={{ kind: "ImeiTarget", index: slot.slot }} acts={acts} />
                <Fact label={`SIM state · slot ${slot.slot + 1}`} text={fieldText(slot.simState)} />
              </div>
            ))}
          </Section>
          <Section caption="Default apps">
            <Fact label="Default SMS app" text={ROLE[setup.smsRole].word} />
            <Fact label="Default phone app" text={ROLE[setup.dialerRole].word} />
            {smsChoiceOffered(carrier) && <SettingRow label="Choose default SMS app" ariaLabel="Choose the default SMS app in Android" onHandoff={() => acts.openPage("PageDefaultApps")} />}
            <Note>If Android denies access, About phone below shows the identifiers. After choosing a default SMS app, tap Refresh identifiers.</Note>
            {!setup.image && <Note title="Phone integration">Carrier activation stays an Android task. Alpha’s Phone, Contacts and Messages need the Alpha system image.</Note>}
          </Section>
          {setup.simsStatus !== "Returned" && <Section caption="Active SIMs"><Fact label="Active SIMs" text={WHY[setup.simsStatus]} /></Section>}
          {setup.simsStatus === "Returned" && setup.sims.length === 0 && (
            <Section caption="Active SIMs">
              <Fact label="Active SIMs" text="None reported" />
              <Note title="Not activated yet?">Insert the carrier’s SIM and complete its activation. A detected SIM or a shown IMEI does not confirm carrier compatibility or service.</Note>
            </Section>
          )}
          {setup.sims.map((sim) => <SimSection key={sim.subscription} sim={sim} carrier={carrier} acts={acts} />)}
          <Section caption="eSIM">
            <Identifier label="EID" carrier={carrier} target={{ kind: "EidTarget", index: -1 }} acts={acts} />
            {setup.eid.status !== "Unsupported" && (
              <ListRow title={carrier.eidReading ? "Reading EID" : "Read EID (optional)"} leading={<CardSim aria-hidden className="size-5" />}
                aria-busy={carrier.eidReading || undefined} disabled={carrier.eidReading} onClick={acts.readEid}
                trailing={carrier.eidReading ? <Spinner size="sm" aria-hidden /> : undefined} />
            )}
          </Section>
          <Section caption="Hardware">
            <Fact label="Manufacturer" text={fieldText(setup.hardware.manufacturer)} />
            <Fact label="Model" text={fieldText(setup.hardware.model)} />
            <Fact label="Device" text={fieldText(setup.hardware.device)} />
            <Fact label="Android version" text={fieldText(setup.hardware.android)} />
            <Fact label="Baseband" text={fieldText(setup.hardware.baseband)} />
          </Section>
        </>
      )}
      <Section caption="Before you activate">
        <Note title="Activate a physical SIM">For T-Mobile Connect with a new number, choose Bring your own phone, a physical SIM and a new number. Check compatibility with the actual IMEI before ordering.</Note>
        <Note title="Before inserting a SIM">The IMEI identifies the phone and can be read before a SIM is in. The ICCID identifies the SIM and may be printed on its card. The EID is for eSIM and is optional for a physical SIM.</Note>
      </Section>
      <Section caption="Android settings">
        <SettingRow label="About phone" icon={<Fingerprint aria-hidden className="size-5" />} ariaLabel="IMEI and device identifiers in Android" onHandoff={() => acts.openPage("PageAbout")} />
        <SettingRow label="SIMs" icon={<CardSim aria-hidden className="size-5" />} ariaLabel="SIM settings in Android" onHandoff={() => acts.openPage("PageSim")} />
        <SettingRow label="Mobile network" icon={<Signal aria-hidden className="size-5" />} ariaLabel="Mobile network settings in Android" onHandoff={() => acts.openPage("PageMobile")} />
        <SettingRow label="Access point names (APN)" icon={<Antenna aria-hidden className="size-5" />} ariaLabel="Access point names in Android" onHandoff={() => acts.openPage("PageApn")} />
        <Note>If Android denies the IMEI, About phone shows it, as does the phone’s box. After activation, refresh here and test calls, texts and mobile data with Wi-Fi off. Use the APN values your carrier gives; this page changes no plan, SIM, network or APN.</Note>
      </Section>
    </>
  );
}
