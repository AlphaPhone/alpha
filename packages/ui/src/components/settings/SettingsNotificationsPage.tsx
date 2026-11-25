import { Bell, BellOff, BellRing, Hash, Radio } from "lucide-react";
import { ListGroup } from "../ListGroup.tsx";
import { SettingsFactRow } from "./SettingsFactRow.tsx";
import { SettingsAndroidRow } from "./SettingsAndroidRow.tsx";
import { SettingsNavRow } from "./SettingsNavRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import type { AndroidTold, Neighbour, Reading, SettingsAndroidProps } from "./vocabulary.ts";

export type SettingsNotificationsPageProps = SettingsAndroidProps & {
  /** Whether Alpha's alerts are on, as the phone last said. */
  alerts: Reading;
  /** Do Not Disturb as Android reported it. */
  doNotDisturb?: Reading;
  /** Status of the phone's listener for other apps. */
  collection?: Reading;
  /** The page can hand over to Android on an actual phone. */
  onPhone?: boolean;
  /** Alpha's alert channels, each with its own page in Android's settings. */
  channels: readonly { id: string; name: string; blocked: boolean }[];
  /** What Alpha tells about the last start of an Android page. */
  told?: AndroidTold;
  /** Goes back to General. */
  onBack?: () => void;
  /** Hands over to the notices area, which collects other apps' notifications. */
  onHandOver?: (neighbour: Neighbour) => void;
};

/**
 * Notifications: whether Alpha's alerts are on, each of its channels, notification access, and the collection of other
 * apps' notifications, which the notices area owns. Alerts are Android's: this page reads them and opens its pages.
 * @model spec/app/settings/facts.md
 */
export function SettingsNotificationsPage({ alerts, doNotDisturb, collection, onPhone = true, channels, told, onBack, onHandOver, starting, onAndroid }: SettingsNotificationsPageProps) {
  const android = { starting, onAndroid };
  return (
    <SettingsPage title="Notifications" told={told} onBack={onBack} backLabel="Back to General">
      <ListGroup>
        {doNotDisturb ? <SettingsFactRow title="Do Not Disturb" icon={<BellOff />} reading={doNotDisturb} /> : null}
        <SettingsAndroidRow target="alpha-alerts" title="Alpha's alerts" icon={<BellRing />} reading={alerts} {...android} />
      </ListGroup>
      {channels.length ? (
        <ListGroup heading="Channels">
          {channels.map(({ id, name, blocked }) => (
            <SettingsAndroidRow key={id} target="alert-channel" channel={id} title={name} icon={<Hash />} reading={blocked ? { word: "reported", value: "Off", status: "off" } : undefined} {...android} />
          ))}
        </ListGroup>
      ) : null}
      {onPhone ? (
        <ListGroup>
          {collection ? <SettingsFactRow title="Other apps' notifications" icon={<Radio />} reading={collection} />
            : <SettingsNavRow title="Other apps' notifications" icon={<Radio />} onOpen={onHandOver && (() => onHandOver("notification-collection"))} />}
          <SettingsAndroidRow target="notification-access" title="Notification access" icon={<Bell />} {...android} />
        </ListGroup>
      ) : null}
    </SettingsPage>
  );
}
