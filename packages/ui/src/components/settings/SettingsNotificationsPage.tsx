import { createContext, type ReactNode } from "react";
import { Bell, Radio, SlidersHorizontal } from "lucide-react";
import { Banner } from "../Banner.tsx";
import { ListGroup } from "../ListGroup.tsx";
import { SettingsFactRow } from "./SettingsFactRow.tsx";
import { SettingsAndroidRow } from "./SettingsAndroidRow.tsx";
import { SettingsNavRow } from "./SettingsNavRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import { SettingsSwitchRow } from "./SettingsSwitchRow.tsx";
import type { AndroidTold, Neighbour, Reading, SettingsAndroidProps } from "./vocabulary.ts";

export type SettingsNotificationsPageProps = SettingsAndroidProps & {
  /** The browser's own saved alert preference and its owner action. */
  browserAlerts?: {
    enabled?: boolean;
    reading?: boolean;
    saving?: boolean;
    saveFailed?: boolean;
    onChoose?: (enabled: boolean) => void;
  };
  /** Whether Alpha's alerts are on, as the phone last said. */
  alerts: Reading;
  /** Do Not Disturb as Android reported it. */
  doNotDisturb?: Reading;
  /** Status of the phone's listener for other apps. */
  collection?: Reading;
  /** Native notification collection is owned by the notices area. */
  collectionPolicy?: ReactNode;
  /** The page can hand over to Android on an actual phone. */
  onPhone?: boolean;
  /** Alpha's alert channels, each with its own page in Android's settings. */
  channels: readonly { id: string; name: string; blocked: boolean }[];
  /** What Alpha tells about the last start of an Android page. */
  told?: AndroidTold;
  /** The heading of the parent page Back returns to. */
  backLabel?: "Back to General" | "Back to Privacy";
  /** Goes back to the parent settings page. */
  onBack?: () => void;
  /** Hands over to the notices area, which collects other apps' notifications. */
  onHandOver?: (neighbour: Neighbour) => void;
};

/**
 * The row that opens Android's notification access, given to the collection drawn in `collectionPolicy` so it sits
 * second in that one card, after Other apps, as the Sunday v119 demo build drew it (Alpha 45f6bed30,
 * prototype/settings-adapter.ts:1150-1155).
 */
export const NotificationAccessRowContext = createContext<ReactNode>(null);

/**
 * Notifications: whether Alpha's notifications are on, Do Not Disturb, Android's page for them, each channel on its own
 * card, notification access, and the collection of other apps' notifications. The web shows its own saved Alerts choice.
 * @model spec/app/settings/facts.md
 */
export function SettingsNotificationsPage({ browserAlerts, alerts, doNotDisturb, collection, collectionPolicy, onPhone = true, channels, told, backLabel = "Back to General", onBack, onHandOver, starting, onAndroid }: SettingsNotificationsPageProps) {
  if (!onPhone) {
    return (
      <SettingsPage title="Notifications" onBack={onBack} backLabel={backLabel}>
        {browserAlerts?.saveFailed ? <Banner variant="warn">Couldn’t save alerts</Banner> : null}
        <ListGroup>
          <SettingsSwitchRow title="Alerts" checked={browserAlerts?.enabled === true} onCheckedChange={browserAlerts?.onChoose}
            reading={browserAlerts?.reading} saving={browserAlerts?.saving} locked={browserAlerts?.enabled === undefined && !browserAlerts?.reading} />
        </ListGroup>
      </SettingsPage>
    );
  }
  const android = { starting, onAndroid };
  return (
    <SettingsPage title="Notifications" told={told} onBack={onBack} backLabel={backLabel}>
      <ListGroup>
        <SettingsFactRow title="Alpha notifications" reading={alerts} />
        {doNotDisturb ? <SettingsFactRow title="Do Not Disturb" reading={doNotDisturb} /> : null}
        <SettingsAndroidRow target="alpha-alerts" title="Notifications" icon={<Bell />} {...android} />
      </ListGroup>
      {channels.map(({ id, name }) => (
        <ListGroup key={id}>
          <SettingsAndroidRow target="alert-channel" channel={id} title={name} icon={<SlidersHorizontal />} {...android} />
        </ListGroup>
      ))}
      {collectionPolicy ? (
        <NotificationAccessRowContext value={<SettingsAndroidRow target="notification-access" title="Android access"
          aria-label="Manage notification access in Android" icon={<SlidersHorizontal />} {...android} />}>{collectionPolicy}</NotificationAccessRowContext>
      ) : (
        <ListGroup>
          {collection ? <SettingsFactRow title="Other apps' notifications" icon={<Radio />} reading={collection} />
            : <SettingsNavRow title="Other apps' notifications" icon={<Radio />} onOpen={onHandOver && (() => onHandOver("notification-collection"))} />}
          <SettingsAndroidRow target="notification-access" title="Notification access" icon={<Bell />} {...android} />
        </ListGroup>
      )}
    </SettingsPage>
  );
}
