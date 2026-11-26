import { ListGroup } from "../ListGroup.tsx";
import { SettingsAccessRow } from "./SettingsAccessRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import type { Access, AccessWord, AndroidTarget, AndroidTold, Reading, SettingsAndroidProps } from "./vocabulary.ts";

const browserAccesses = ["camera", "microphone", "location", "photos", "files", "notifications"] as const;

export type SettingsPermissionsPageProps = SettingsAndroidProps & {
  /** What the phone said about each access; one it did not report is unavailable, never allowed. */
  grants: Record<Access, AccessWord>;
  /** The browser’s reported permissions and its local file and photo scopes. */
  browser?: Record<typeof browserAccesses[number], Reading>;
  /** Opens Alpha’s Notifications settings. */
  onNotifications?: () => void;
  /** What Alpha tells about the last start of an Android page. */
  told?: AndroidTold;
  /** Goes back to Privacy. */
  onBack?: () => void;
};

const android = {
  camera: "app-permissions",
  microphone: "app-permissions",
  location: "app-permissions",
  calendar: "app-permissions",
  photos: "photo-permissions",
  files: "all-files-access",
} as const satisfies Record<Exclude<Access, "notifications">, AndroidTarget>;

const accesses: Access[] = ["camera", "microphone", "location", "calendar", "photos", "files", "notifications"];

/**
 * The reported permissions and the owner's shortcuts to their Android or Alpha settings.
 * @model spec/app/settings/facts.md
 */
export function SettingsPermissionsPage({ grants, browser, onNotifications, told, onBack, starting, onAndroid }: SettingsPermissionsPageProps) {
  if (browser) return (
    <SettingsPage title="App permissions" onBack={onBack} backLabel="Back to Privacy">
      <ListGroup className="[&>div>div>span>span:last-child]:flex">
        {browserAccesses.map((access) => (
          <SettingsAccessRow key={access} access={access} grant={browser[access]} onOpen={access === "notifications" ? onNotifications : undefined} />
        ))}
      </ListGroup>
    </SettingsPage>
  );
  return (
    <SettingsPage title="App permissions" told={told} onBack={onBack} backLabel="Back to Privacy">
      <ListGroup>
        {accesses.map((access) => (
          <SettingsAccessRow key={access} access={access} grant={grants[access]} disabled={starting !== undefined}
            onOpen={access === "notifications" ? onNotifications : onAndroid && (() => onAndroid({ target: android[access] }))} />
        ))}
      </ListGroup>
    </SettingsPage>
  );
}
