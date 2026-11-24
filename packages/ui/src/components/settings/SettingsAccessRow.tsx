import type { ReactNode } from "react";
import { Calendar, Camera, Folder, Image, MapPin, Mic, Bell } from "lucide-react";
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

const names: Record<Access, { title: string; icon: ReactNode }> = {
  camera: { title: "Camera", icon: <Camera /> },
  microphone: { title: "Microphone", icon: <Mic /> },
  location: { title: "Location", icon: <MapPin /> },
  calendar: { title: "Calendar", icon: <Calendar /> },
  photos: { title: "Photos", icon: <Image /> },
  files: { title: "Files", icon: <Folder /> },
  notifications: { title: "Notifications", icon: <Bell /> },
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
  const { title, icon } = names[access];
  return <SettingsNavRow title={title} icon={icon} detail={<SettingsReading reading={readings[grant]} />} onOpen={onReview} />;
}
