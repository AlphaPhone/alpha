import type { ReactNode } from "react";
import { Bell, CalendarDays, Camera, Folder, Images, SlidersHorizontal } from "lucide-react";
import { SettingsFactRow } from "./SettingsFactRow.tsx";
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

const icons: Record<Access, ReactNode> = {
  camera: <Camera />,
  microphone: <SlidersHorizontal />,
  location: <SlidersHorizontal />,
  calendar: <CalendarDays />,
  photos: <Images />,
  files: <Folder />,
  notifications: <Bell />,
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
 * did not report is never shown as allowed. With a review, the state sits at the row's end before the chevron; without
 * one, under the access, as a fact.
 * @model spec/app/settings/facts.md
 */
export function SettingsAccessRow({ access, grant, onReview }: SettingsAccessRowProps) {
  const title = names[access];
  if (!onReview) return <SettingsFactRow title={title} reading={readings[grant]} />;
  return <SettingsNavRow title={title} icon={icons[access]} value={<SettingsReading reading={readings[grant]} />} onOpen={onReview} />;
}
