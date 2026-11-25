import { Copy, SlidersHorizontal } from "lucide-react";
import { Banner } from "../Banner.tsx";
import { Button } from "../Button.tsx";
import { ListGroup } from "../ListGroup.tsx";
import { ListRow } from "../ListRow.tsx";
import { Spinner } from "../Spinner.tsx";
import { SettingsAndroidRow } from "./SettingsAndroidRow.tsx";
import { SettingsFactRow } from "./SettingsFactRow.tsx";
import { SettingsNavRow } from "./SettingsNavRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import type { AndroidTold, SettingsAndroidProps } from "./vocabulary.ts";

/** One identifier a carrier asks for, with what Android returned for it, or why it returned nothing. */
export type SettingsCarrierField = {
  /** What it is, such as IMEI 1 or ICCID. */
  name: string;
  /** The SIM or hardware group this fact belongs to. */
  group?: string;
  /** IMEI, ICCID or EID can be copied individually. */
  identifier?: boolean;
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
  const groups = new Map<string | undefined, SettingsCarrierField[]>();
  for (const field of fields) {
    const group = groups.get(field.group);
    if (group === undefined) groups.set(field.group, [field]);
    else group.push(field);
  }
  return (
    <SettingsPage title="Carrier & SIM setup" told={told} onBack={onBack} backLabel="Back to General">
      <div role="status" aria-live="polite" className="empty:-mt-3">{copied ? <Banner variant={copied === "copied" ? "info" : "warn"}>{copied === "copied" ? "Copied" : "Could not copy"}</Banner> : null}</div>
      <ListGroup>
        {reading ? <ListRow title="Reading identifiers…" leading={<SlidersHorizontal />} trailing={<Spinner size="sm" label="Reading" />} /> : null}
        {!reading && onShow ? <SettingsNavRow title={fields.length ? "Refresh identifiers" : "Show identifiers"} icon={<SlidersHorizontal />} onOpen={onShow} /> : null}
        <SettingsFactRow title="Private device information" description="Read only when you tap above. Values clear when you leave this page. Copy uses the Android clipboard." />
        {failed ? <SettingsFactRow title="Read unavailable" description="Keep Alpha in front and the phone unlocked, then try again. You can also use Android device identifiers below." /> : null}
      </ListGroup>
      {[...groups].map(([heading, rows]) => (
        <ListGroup key={heading ?? "identifiers"} heading={heading}>
          {rows.map(({ name, value, identifier, missing: why }) => (
            <ListRow
              key={name}
              title={name}
              detail={value ?? (why ? missing[why] : undefined)}
              trailing={identifier && value !== undefined && onCopy && (copyable?.(value) ?? true) ? <Button size="icon" variant="ghost" aria-label={`Copy ${name}`} onClick={() => onCopy(value)}><Copy /></Button> : undefined}
            />
          ))}
        </ListGroup>
      ))}
      {onReadEid ? (
        <ListGroup>
          <SettingsNavRow title="Read EID" icon={<SlidersHorizontal />} onOpen={onReadEid} />
        </ListGroup>
      ) : null}
      <ListGroup>
        <SettingsFactRow title="Activate a physical SIM" description="For T-Mobile Connect with a new number, choose Bring your own phone, a physical SIM and a new number with the carrier. Check compatibility using the actual IMEI before ordering." />
        <SettingsFactRow title="Before inserting a SIM" description="IMEI identifies the phone and can be read before a SIM is installed. ICCID identifies the SIM and may be printed on its card. EID is for eSIM and is optional for a physical SIM." />
      </ListGroup>
      <ListGroup>
        <SettingsAndroidRow target="about-phone" title="Android device identifiers / About phone" icon={<SlidersHorizontal />} {...android} />
        <SettingsFactRow title="If IMEI access is denied" description="In Android About phone, open IMEI or device identifiers. You can also check the original phone box. On a supported system Phone dial pad, *#06# may show identifiers; Alpha does not simulate this code." />
        <SettingsAndroidRow target="sim-cards" title="Android SIM settings" icon={<SlidersHorizontal />} {...android} />
        <SettingsAndroidRow target="mobile-networks" title="Android mobile network settings" icon={<SlidersHorizontal />} {...android} />
        <SettingsAndroidRow target="access-point-names" title="Android access point names (APN)" icon={<SlidersHorizontal />} {...android} />
        {smsChoice ? <SettingsAndroidRow target="default-apps" title="Choose default SMS app in Android" icon={<SlidersHorizontal />} {...android} /> : null}
        <SettingsFactRow title="After activation" description="Refresh identifiers and confirm the SIM and network state. Test calls, SMS and mobile data with Wi-Fi off. Use APN values supplied by T-Mobile; this page does not change your plan, SIM, network or APN." />
      </ListGroup>
    </SettingsPage>
  );
}
