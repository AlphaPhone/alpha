import { FolderLock, MapPin, ShieldCheck } from "lucide-react";
import { ListGroup } from "../ListGroup.tsx";
import { SettingsAccessRow } from "./SettingsAccessRow.tsx";
import { SettingsAndroidRow } from "./SettingsAndroidRow.tsx";
import { SettingsPage } from "./SettingsPage.tsx";
import type { Access, AccessWord, AndroidTold, SettingsAndroidProps } from "./vocabulary.ts";

export type SettingsPermissionsPageProps = SettingsAndroidProps & {
  /** What the phone said about each access; one it did not report is unavailable, never allowed. */
  grants: Record<Access, AccessWord>;
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
export function SettingsPermissionsPage({ grants, told, onBack, onReview, starting, onAndroid }: SettingsPermissionsPageProps) {
  return (
    <SettingsPage title="Permissions" told={told} onBack={onBack}>
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
