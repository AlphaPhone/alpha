// spec/settings/carrier.md, "Story: Read carrier activation details only when I ask"
import { carrierFieldText, type CarrierPage } from "../../settings/carrier.ts";
import type { CarrierField, CarrierSetup } from "../../settings/native.schema.vibe";
import { Alert, Button } from "../components/ui/index.ts";
import { Section, SettingRow } from "./Rows.tsx";

export interface CarrierSetupPageProps {
  readonly available: boolean;
  readonly data?: CarrierSetup;
  readonly busy: boolean;
  readonly eidBusy: boolean;
  readonly failed: boolean;
  readonly notice: string;
  readonly show: () => void;
  readonly showEid: () => void;
  readonly copy: (key: string) => void;
  readonly open: (page: CarrierPage) => void;
}

function Fact({ label, field, onCopy }: { readonly label: string; readonly field: CarrierField; readonly onCopy?: () => void }) {
  return (
    <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2">
      <p className="min-w-0">
        <span className="block">{label}</span>
        <span className="block text-sm break-all text-muted-foreground">{carrierFieldText(field)}</span>
      </p>
      {onCopy && field.status === "available" && field.value?.trim() && (
        <Button variant="secondary" size="sm" aria-label={`Copy ${label}`} onClick={onCopy}>Copy</Button>
      )}
    </div>
  );
}

function CarrierFacts({ data, eidBusy, showEid, copy, open }: Pick<CarrierSetupPageProps, "eidBusy" | "showEid" | "copy" | "open"> & { readonly data: CarrierSetup }) {
  const { slots, subscriptions, hardware, eid } = data;
  return (
    <>
      <Section caption="Modem slots">
        {slots.length === 0 && <SettingRow label="IMEI" state={{ word: "No modem slot reported" }} />}
        {slots.map(({ slotIndex, imei, simState }) => (
          <div key={slotIndex}>
            <Fact label={`IMEI ${slotIndex + 1}`} field={imei} onCopy={() => copy(`imei-${slotIndex}`)} />
            <Fact label={`SIM state · slot ${slotIndex + 1}`} field={simState} />
          </div>
        ))}
      </Section>
      <Section caption="Default apps">
        <Fact label="Default SMS app" field={data.smsRole} />
        <Fact label="Default phone app" field={data.dialerRole} />
        {data.canChooseSms && <SettingRow label="Choose default SMS app in Android" onHandoff={() => open("default-sms")} />}
      </Section>
      {!data.aospImage && <p className="px-4 text-sm text-muted-foreground">Alpha Phone, Contacts and Messages are available on the Alpha system image. You can manage carrier activation in Android Settings.</p>}
      {subscriptions.status !== "available" ? (
        <Section><Fact label="Active SIMs" field={{ status: subscriptions.status }} /></Section>
      ) : subscriptions.items.length === 0 ? (
        <Section><SettingRow label="Active SIMs" state={{ word: "No active subscription reported" }} /></Section>
      ) : subscriptions.items.map((sim) => (
        <Section key={sim.subscriptionId} caption="Active SIM">
          <SettingRow label="SIM type" state={{ word: sim.embedded ? "eSIM" : "Physical SIM" }} />
          <SettingRow label="SIM slot" state={{ word: sim.slotIndex >= 0 ? String(sim.slotIndex + 1) : "Not reported" }} />
          <Fact label="Carrier" field={sim.carrier} />
          <Fact label="SIM name" field={sim.name} />
          <Fact label="ICCID" field={sim.iccid} onCopy={() => copy(`iccid-${sim.subscriptionId}`)} />
          <Fact label="Network operator" field={sim.operator} />
          <Fact label="Operator code (MCC/MNC)" field={sim.operatorCode} />
          <Fact label="Mobile data setting" field={sim.dataEnabled} />
          <Fact label="Data connection" field={sim.dataState} />
          <Fact label="Data network" field={sim.networkType} />
          <Fact label="Roaming" field={sim.roaming} />
          <SettingRow label="Default data SIM" state={{ word: sim.defaultData ? "Yes" : "No" }} />
        </Section>
      ))}
      <Section caption="eSIM">
        <Fact label="EID (eSIM)" field={eid} onCopy={() => copy("eid")} />
        {eid.status !== "unsupported" && <SettingRow label="Read eSIM EID (optional)" busy={eidBusy} onOpen={showEid} />}
      </Section>
      <Section caption="Device hardware">
        <Fact label="Manufacturer" field={hardware.manufacturer} />
        <Fact label="Model" field={hardware.model} />
        <Fact label="Device" field={hardware.device} />
        <Fact label="Android version" field={hardware.android} />
        <Fact label="Baseband" field={hardware.baseband} />
      </Section>
    </>
  );
}

/** The private activation page in Settings → General, usable without the Alpha AOSP image. */
export function CarrierSetupPage(props: CarrierSetupPageProps) {
  const { available, data, busy, failed, notice, show, open } = props;
  return (
    <>
      <Section>
        {available
          ? <SettingRow label={busy ? "Reading identifiers…" : data ? "Refresh identifiers" : "Show identifiers"} busy={busy} onOpen={show} />
          : <SettingRow label="Device identifiers" state={{ word: "Available only on an Android phone" }} />}
      </Section>
      {available && <p className="px-4 text-sm text-muted-foreground">Alpha clears these details when you leave this page or put the phone in the background. Copy places one identifier on the Android clipboard.</p>}
      {failed && <Alert variant="warn">Keep Alpha in front and the phone unlocked, then try again. You can also open Android device identifiers below.</Alert>}
      {notice !== "" && <Alert>{notice}</Alert>}
      {data && <CarrierFacts {...props} data={data} />}
      <Section caption="Activate a physical SIM">
        <div className="space-y-2 px-4 py-3 text-sm text-muted-foreground">
          <p>For T-Mobile Connect with a new number, choose Bring your own phone, a physical SIM and a new number. Check compatibility with your IMEI before ordering.</p>
          <p>You can read the phone’s IMEI before inserting a SIM. The ICCID may be printed on the SIM card. EID is optional for a physical SIM.</p>
        </div>
      </Section>
      {available && (
        <Section caption="Android Settings">
          <SettingRow label="Android device identifiers / About phone" onHandoff={() => open("identifiers")} />
          <SettingRow label="Android SIM settings" onHandoff={() => open("sim")} />
          <SettingRow label="Android mobile network settings" onHandoff={() => open("mobile")} />
          <SettingRow label="Android access point names (APN)" onHandoff={() => open("apn")} />
          <div className="space-y-2 px-4 py-3 text-sm text-muted-foreground">
            <p>If Android denies access, look up the IMEI under About phone or on the original phone box. The Android system Phone dial pad may show it with *#06#.</p>
            <p>After activation, refresh to check SIM and network status. Turn Wi-Fi off to test calls, SMS and mobile data. Use APN values supplied by your carrier.</p>
          </div>
        </Section>
      )}
    </>
  );
}
