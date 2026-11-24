import { AppWindow, Battery, Bell, Bluetooth, Lock, Phone, Plane, Signal, Sun, Volume2, Wifi } from "lucide-react";
import { ListGroup } from "../ListGroup.tsx";
import { SettingsAndroidRow } from "./SettingsAndroidRow.tsx";
import { SettingsNavRow } from "./SettingsNavRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import { type SettingsPageLink, SettingsPageLinks } from "./SettingsPageLinks.tsx";
import { SettingsResetNotice, type SettingsResetNoticeProps } from "./SettingsResetNotice.tsx";
import { SettingsResetRow } from "./SettingsResetRow.tsx";
import { type AndroidTold, placed, type Reading, type SettingsAndroidProps, type SettingsPageName, type SettingsPlaceProps } from "./vocabulary.ts";

export type SettingsGeneralPageProps = SettingsAndroidProps &
  SettingsPlaceProps & {
    /** Wi-Fi, as the phone last said. */
    wifi: Reading;
    /** Bluetooth, as the phone last said. */
    bluetooth: Reading;
    /** Mobile data, as the phone last said. */
    mobileData: Reading;
    /** The phone runs an Alpha image, which has the Phone page. */
    image?: boolean;
    /** What Alpha tells about the last start of an Android page. */
    told?: AndroidTold;
    /** Goes back to the first page. */
    onBack?: () => void;
    /** Opens a page that hangs from this one. */
    onOpen?: (page: SettingsPageName) => void;
    /** Alpha runs on the phone itself, so Erase all data is on this page. */
    onPhone?: boolean;
    /** The phone's review of a reset is open. */
    reviewing?: boolean;
    /** Asks the phone to review a reset; offered while no reset is pending. */
    onErase?: () => void;
    /** What Alpha said about the last reset attempt. */
    said?: SettingsResetNoticeProps["said"];
  };

const links: SettingsPageLink[] = [
  { page: "display", title: "Display", icon: <Sun /> },
  { page: "sound", title: "Sound", icon: <Volume2 /> },
  { page: "notifications", title: "Notifications", icon: <Bell /> },
  { page: "battery", title: "Battery", icon: <Battery /> },
];

/**
 * General: its pages, the network as the phone reports it with the way into Android's settings for it, the screen lock
 * and default apps, and Erase all data at the foot. Rows are numbered by slot, as on the first page.
 * @model spec/app/settings/index.md
 */
export function SettingsGeneralPage({ wifi, bluetooth, mobileData, image = false, told, onBack, onOpen, onPhone = false, reviewing, onErase, said, starting, onAndroid, place, onPlace }: SettingsGeneralPageProps) {
  const at = (row: number) => placed({ place, onPlace }, row);
  const android = { starting, onAndroid };
  return (
    <SettingsPage title="General" told={told} onBack={onBack}>
      {said ? <SettingsResetNotice said={said} /> : null}
      <ListGroup>
        <SettingsPageLinks links={links} onOpen={onOpen} place={place} onPlace={onPlace} />
        {image ? <SettingsNavRow title="Phone" icon={<Phone />} onOpen={onOpen && (() => onOpen("phone"))} {...at(4)} /> : null}
      </ListGroup>
      <ListGroup>
        <SettingsAndroidRow target="wifi-networks" title="Wi-Fi" icon={<Wifi />} reading={wifi} {...android} {...at(5)} />
        <SettingsAndroidRow target="bluetooth-devices" title="Bluetooth" icon={<Bluetooth />} reading={bluetooth} {...android} {...at(6)} />
        <SettingsAndroidRow target="mobile-networks" title="Mobile data" icon={<Signal />} reading={mobileData} {...android} {...at(7)} />
        <SettingsAndroidRow target="airplane-mode" title="Airplane mode" icon={<Plane />} {...android} {...at(8)} />
      </ListGroup>
      <ListGroup>
        <SettingsAndroidRow target="screen-lock" title="Screen lock" icon={<Lock />} {...android} {...at(9)} />
        <SettingsAndroidRow target="default-apps" title="Default apps" icon={<AppWindow />} {...android} {...at(10)} />
      </ListGroup>
      {onPhone ? (
        <ListGroup>
          <SettingsResetRow reviewing={reviewing} onErase={onErase} {...at(11)} />
        </ListGroup>
      ) : null}
    </SettingsPage>
  );
}
