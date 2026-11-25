import type { ReactNode } from "react";
import { AppWindow, Battery, Bell, Bluetooth, Lock, Phone, Plane, Signal, Smartphone, Sun, Volume2, Wifi, WifiCog } from "lucide-react";
import { ListGroup } from "../ListGroup.tsx";
import { SettingsAndroidRow } from "./SettingsAndroidRow.tsx";
import { SettingsNavRow } from "./SettingsNavRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import { SettingsReading } from "./SettingsReading.tsx";
import { SettingsResetNotice, type SettingsResetNoticeProps } from "./SettingsResetNotice.tsx";
import { SettingsResetRow } from "./SettingsResetRow.tsx";
import { SettingsRoleRow, type SettingsRoleRowProps } from "./SettingsRoleRow.tsx";
import { SettingsSetAsHomeRow } from "./SettingsSetAsHomeRow.tsx";
import { type AndroidTold, placed, type Reading, type SettingsAndroidProps, type SettingsPageName, type SettingsPlaceProps } from "./vocabulary.ts";

export type SettingsGeneralPageProps = SettingsAndroidProps &
  SettingsPlaceProps & {
    /** Wi-Fi, as the phone last said. */
    wifi: Reading;
    /** Bluetooth, as the phone last said. */
    bluetooth: Reading;
    /** Mobile data, as the phone last said. */
    mobileData: Reading;
    /** The appearance chosen, beside Display. */
    theme?: "system" | "light" | "dark";
    /** Alpha's alerts, as the phone last said, under Notifications. */
    alerts?: Reading;
    /** The phone runs an Alpha image, which has the Phone page. */
    image?: boolean;
    /** What Alpha tells about the last start of an Android page. */
    told?: AndroidTold;
    /** Goes back to the first page. */
    onBack?: () => void;
    /** Opens a page that hangs from this one. */
    onOpen?: (page: SettingsPageName) => void;
    /** Alpha runs on the phone itself, so Network, Carrier & SIM setup and Erase all data are on this page. */
    onPhone?: boolean;
    /** The phone's review of a reset is open. */
    reviewing?: boolean;
    /** Asks the phone to review a reset; offered while no reset is pending. */
    onErase?: () => void;
    /** Who holds the Home role, as the phone last said; shown on a phone. */
    home?: SettingsRoleRowProps["word"];
    /** Who holds the Assistant role, as the phone last said; shown on a phone. */
    assistant?: SettingsRoleRowProps["word"];
    /** Android's dialog for the Home role is open. */
    requestingHome?: boolean;
    /** Asks Android to make Alpha the Home app; offered when the phone reported a role Alpha can take and does not hold. */
    onRequestHome?: () => void;
    /** What Alpha said about the last reset attempt. */
    said?: SettingsResetNoticeProps["said"];
    /** Update rows owned by the update area. */
    updates?: ReactNode;
    /** Commands in the General header. */
    actions?: ReactNode;
  };

const themes = { system: "System", light: "Light", dark: "Dark" } as const;

/**
 * General: Carrier & SIM setup on its own, its pages, the network as the phone reports it with the way into Android's
 * settings for it, who holds the Home and Assistant roles with Set as Home, default apps and the screen lock, Erase all
 * data, and the Phone page last, on an Alpha image.
 * Rows are numbered by slot, as on the first page.
 * @model spec/app/settings/index.md
 */
export function SettingsGeneralPage({ wifi, bluetooth, mobileData, theme, alerts, image = false, told, onBack, onOpen, onPhone = false, reviewing, onErase, home, assistant, requestingHome, onRequestHome, said, updates, starting, onAndroid, place, onPlace, actions }: SettingsGeneralPageProps) {
  const at = (row: number) => placed({ place, onPlace }, row);
  const android = { starting, onAndroid };
  return (
    <SettingsPage title="General" told={told} onBack={onBack} backLabel="Back to Settings" actions={actions}>
      {said ? <SettingsResetNotice said={said} /> : null}
      {onPhone ? (
        <ListGroup>
          <SettingsNavRow title="Carrier & SIM setup" detail="IMEI, SIM status and activation" icon={<Smartphone />} onOpen={onOpen && (() => onOpen("carrier"))} {...at(13)} />
        </ListGroup>
      ) : null}
      <ListGroup>
        <SettingsNavRow title="Display" icon={<Sun />} value={theme ? themes[theme] : undefined} onOpen={onOpen && (() => onOpen("display"))} {...at(0)} />
        <SettingsNavRow title="Notifications" icon={<Bell />} detail={alerts ? <SettingsReading reading={alerts} /> : undefined} onOpen={onOpen && (() => onOpen("notifications"))} {...at(2)} />
        <SettingsNavRow title="Sound" icon={<Volume2 />} onOpen={onOpen && (() => onOpen("sound"))} {...at(1)} />
        <SettingsNavRow title="Battery" icon={<Battery />} onOpen={onOpen && (() => onOpen("battery"))} {...at(3)} />
      </ListGroup>
      <ListGroup>
        {onPhone ? <SettingsNavRow title="Network" icon={<WifiCog />} onOpen={onOpen && (() => onOpen("network"))} {...at(12)} /> : null}
        <SettingsAndroidRow target="wifi-networks" title="Wi-Fi" icon={<Wifi />} reading={wifi} {...android} {...at(5)} />
        <SettingsAndroidRow target="bluetooth-devices" title="Bluetooth" icon={<Bluetooth />} reading={bluetooth} {...android} {...at(6)} />
        <SettingsAndroidRow target="mobile-networks" title="Mobile data" icon={<Signal />} reading={mobileData} {...android} {...at(7)} />
        <SettingsAndroidRow target="airplane-mode" title="Airplane mode" icon={<Plane />} {...android} {...at(8)} />
      </ListGroup>
      <ListGroup>
        {onPhone && home ? <SettingsRoleRow role="home" word={home} /> : null}
        {onPhone && assistant ? <SettingsRoleRow role="assistant" word={assistant} /> : null}
        {requestingHome || onRequestHome ? <SettingsSetAsHomeRow requesting={requestingHome} onRequest={onRequestHome} {...at(14)} /> : null}
        <SettingsAndroidRow target="default-apps" title="Default apps" icon={<AppWindow />} {...android} {...at(10)} />
        <SettingsAndroidRow target="screen-lock" title="Screen lock" icon={<Lock />} {...android} {...at(9)} />
      </ListGroup>
      {updates}
      {onPhone ? (
        <ListGroup>
          <SettingsResetRow reviewing={reviewing} onErase={onErase} {...at(11)} />
        </ListGroup>
      ) : null}
      {image ? (
        <ListGroup>
          <SettingsNavRow title="Phone" icon={<Phone />} onOpen={onOpen && (() => onOpen("phone"))} {...at(4)} />
        </ListGroup>
      ) : null}
    </SettingsPage>
  );
}
