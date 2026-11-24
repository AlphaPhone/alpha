import { AppWindow, Copy, Info, RadioTower, Settings2, Signal } from "lucide-react";
import { Banner } from "../Banner.tsx";
import { Button } from "../Button.tsx";
import { ListGroup } from "../ListGroup.tsx";
import { ListRow } from "../ListRow.tsx";
import { Spinner } from "../Spinner.tsx";
import { SettingsAndroidRow } from "./SettingsAndroidRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import type { AndroidTold, SettingsAndroidProps } from "./vocabulary.ts";

/** One identifier a carrier asks for, with what Android returned for it, or why it returned nothing. */
export type SettingsCarrierField = {
  /** What it is, such as IMEI 1 or ICCID. */
  name: string;
  /** What Android returned; only then is it shown and can it be copied. */
  value?: string;
  /** Why Android returned nothing. */
  missing?: "access-denied" | "unavailable" | "unsupported" | "not-read";
};

export type SettingsCarrierPageProps = SettingsAndroidProps & {
  /** The identifiers from the last read that answered, the EID with them once read; none until the owner asks. */
  fields: SettingsCarrierField[];
  /** The identifiers are being read. */
  reading?: boolean;
  /** The last read failed or was not answered in time. */
  failed?: boolean;
  /** The last read says Alpha can take the SMS role, so Android's default apps are offered to choose it. */
  smsChoice?: boolean;
  /** Whether the last copy put the identifier on the clipboard. */
  copied?: "copied" | "failed";
  /** Reads the identifiers; offered only when the owner may ask. */
  onShow?: () => void;
  /** Reads the EID, on a phone with an eSIM, after the identifiers. */
  onReadEid?: () => void;
  /** Copies one identifier Android returned; the button shows only with it, one copy at a time. */
  onCopy?: (value: string) => void;
  /** Whether a value may be copied now. */
  copyable?: (value: string) => boolean;
  /** What Alpha tells about the last start of an Android page. */
  told?: AndroidTold;
  /** Goes back to General. */
  onBack?: () => void;
};

const missing: Record<NonNullable<SettingsCarrierField["missing"]>, string> = {
  "access-denied": "Access denied by Android", unavailable: "Unavailable from Android", unsupported: "Not supported on this phone", "not-read": "Not read",
};

/**
 * Carrier & SIM setup, on a phone: the identifiers a carrier asks for to activate a SIM, read only when the owner asks
 * and forgotten when the page goes, each copied on its own, and Android's SIM, network and default-app pages.
 * @model spec/app/settings/carrier.md
 */
export function SettingsCarrierPage({ fields, reading = false, failed = false, smsChoice = false, copied, onShow, onReadEid, onCopy, copyable, told, onBack, starting, onAndroid }: SettingsCarrierPageProps) {
  const android = { starting, onAndroid };
  return (
    <SettingsPage title="Carrier & SIM setup" told={told} onBack={onBack}>
      {failed ? <Banner variant="warn">The identifiers could not be read</Banner> : null}
      <div role="status" aria-live="polite">{copied ? <Banner variant={copied === "copied" ? "info" : "warn"}>{copied === "copied" ? "Copied" : "Could not copy"}</Banner> : null}</div>
      {reading ? <ListRow title="Reading identifiers" trailing={<Spinner size="sm" label="Reading" />} /> : null}
      {fields.length ? (
        <ListGroup>
          {fields.map(({ name, value, missing: why }) => (
            <ListRow
              key={name}
              title={name}
              detail={value ?? (why ? missing[why] : undefined)}
              trailing={value !== undefined && onCopy && (copyable?.(value) ?? true) ? <Button size="icon" variant="ghost" aria-label={`Copy ${name}`} onClick={() => onCopy(value)}><Copy /></Button> : undefined}
            />
          ))}
        </ListGroup>
      ) : null}
      {onShow || onReadEid ? (
        <div className="flex flex-wrap gap-2 px-4">
          {onShow ? <Button onClick={onShow}>Show identifiers</Button> : null}
          {onReadEid ? <Button variant="outline" onClick={onReadEid}>Read EID</Button> : null}
        </div>
      ) : null}
      <ListGroup>
        <SettingsAndroidRow target="sim-cards" title="SIMs" icon={<RadioTower />} {...android} />
        <SettingsAndroidRow target="mobile-networks" title="Mobile networks" icon={<Signal />} {...android} />
        <SettingsAndroidRow target="access-point-names" title="Access point names" icon={<Settings2 />} {...android} />
        {smsChoice ? <SettingsAndroidRow target="default-apps" title="Default SMS app" icon={<AppWindow />} {...android} /> : null}
        <SettingsAndroidRow target="about-phone" title="About phone" icon={<Info />} {...android} />
      </ListGroup>
    </SettingsPage>
  );
}
