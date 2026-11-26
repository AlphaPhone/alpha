import { FolderLock, MapPin, ShieldCheck } from "lucide-react";
import { ListGroup } from "../ListGroup.tsx";
import { SettingsAccessRow } from "./SettingsAccessRow.tsx";
import { SettingsAndroidRow } from "./SettingsAndroidRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import type { Access, AccessWord, AndroidTold, Reading, SettingsAndroidProps } from "./vocabulary.ts";

const browserAccesses = ["camera", "microphone", "location", "photos", "files", "notifications"] as const;

export type SettingsPermissionsPageProps = SettingsAndroidProps & {
  /** What the phone said about each access; one it did not report is unavailable, never allowed. */
  grants: Record<Access, AccessWord>;
  /** The browser’s reported permissions and its local file and photo scopes. */
  browser?: Record<typeof browserAccesses[number], Reading>;
  /** Opens the browser's own Notifications setting. */
  onNotifications?: () => void;
  /** What Alpha tells about the last start of an Android page. */
  told?: AndroidTold;
  /** Goes back to Privacy. */
  onBack?: () => void;
  /** Opens the access walkthrough to review one access. */
  onReview?: (access: Access) => void;
};

const accesses: Access[] = ["camera", "microphone", "location", "calendar", "photos", "files", "notifications"];

/**
 * Permissions: each access Alpha holds as the phone reports it, each opening the walkthrough to review it, and the way
 * into Android's permission, all-files and location settings.
 * @model spec/app/settings/facts.md
 */
export function SettingsPermissionsPage({ grants, browser, onNotifications, told, onBack, onReview, starting, onAndroid }: SettingsPermissionsPageProps) {
  if (browser) return (
    <SettingsPage title="App permissions" onBack={onBack} backLabel="Back to Privacy">
      <ListGroup className="[&>div>div>span>span:last-child]:flex">
        {browserAccesses.map((access) => (
          <SettingsAccessRow key={access} access={access} grant={browser[access]} onReview={access === "notifications" ? onNotifications : undefined} />
        ))}
      </ListGroup>
    </SettingsPage>
  );
  return (
    <SettingsPage title="App permissions" told={told} onBack={onBack} backLabel="Back to Privacy">
      <ListGroup>
        {accesses.map((access) => (
          <SettingsAccessRow key={access} access={access} grant={grants[access]} onReview={onReview && (() => onReview(access))} />
        ))}
      </ListGroup>
      <ListGroup>
        <SettingsAndroidRow target="app-permissions" title="Alpha's permissions" icon={<ShieldCheck />} starting={starting} onAndroid={onAndroid} />
        <SettingsAndroidRow target="all-files-access" title="Access to all files" icon={<FolderLock />} starting={starting} onAndroid={onAndroid} />
        <SettingsAndroidRow target="location-settings" title="Location" icon={<MapPin />} starting={starting} onAndroid={onAndroid} />
      </ListGroup>
    </SettingsPage>
  );
}
