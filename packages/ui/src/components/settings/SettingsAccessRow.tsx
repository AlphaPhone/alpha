import { SettingsNavRow } from "./SettingsNavRow.tsx";
import { SettingsReading } from "./SettingsReading.tsx";
import type { Access, AccessWord, Reading } from "./vocabulary.ts";

export type SettingsAccessRowProps = {
  /** Which access the row is about. */
  access: Access;
  /** What the phone said about its grant. */
  grant: AccessWord;
  /** Opens the access walkthrough to review this one access; the row is pressable only with it. */
  onReview?: () => void;
};

const names: Record<Access, string> = {
  camera: "Camera",
  microphone: "Microphone",
  location: "Location",
  calendar: "Calendar",
  photos: "Photos",
  files: "Files",
  notifications: "Notifications",
};

const readings: Record<AccessWord, Reading> = {
  waiting: { word: "waiting" },
  unavailable: { word: "unavailable" },
  allowed: { word: "reported", value: "Allowed", status: "ok" },
  approximate: { word: "reported", value: "Approximate", status: "warn" },
  off: { word: "reported", value: "Off", status: "off" },
};

/**
 * One access Alpha holds and whether the phone says it is allowed, approximate, off or unavailable. An access the phone
 * did not report is never shown as allowed.
 * @model spec/app/settings/facts.md
 */
export function SettingsAccessRow({ access, grant, onReview }: SettingsAccessRowProps) {
  const title = names[access];
  return <SettingsNavRow title={title} detail={<SettingsReading reading={readings[grant]} />} onOpen={onReview} />;
}
