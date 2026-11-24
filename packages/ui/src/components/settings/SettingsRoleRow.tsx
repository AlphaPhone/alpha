import { House, Sparkles } from "lucide-react";
import { ListRow } from "../ListRow.tsx";
import { SettingsReading } from "./SettingsReading.tsx";
import type { Reading } from "./vocabulary.ts";

export type SettingsRoleRowProps = {
  /** The role: the Home app or the Assistant. */
  role: "home" | "assistant";
  /** Who holds it, as the phone last said; the phone does not always say who else holds it, so Alpha never claims none does. */
  word: "waiting" | "unavailable" | "not-on-this-phone" | "alpha" | "another" | "not-alpha";
};

const titles = { home: { title: "Home app", icon: <House /> }, assistant: { title: "Assistant", icon: <Sparkles /> } };

const readings: Record<SettingsRoleRowProps["word"], Reading> = {
  waiting: { word: "waiting" },
  unavailable: { word: "unavailable" },
  "not-on-this-phone": { word: "reported", value: "Not on this phone" },
  alpha: { word: "reported", value: "Alpha", status: "ok" },
  another: { word: "reported", value: "Another app", status: "off" },
  "not-alpha": { word: "reported", value: "Not Alpha", status: "off" },
};

/**
 * Who holds the Home or the Assistant role, as the phone reports it.
 * @model spec/app/settings/facts.md
 */
export function SettingsRoleRow({ role, word }: SettingsRoleRowProps) {
  const { title, icon } = titles[role];
  return <ListRow title={title} leading={icon} detail={<SettingsReading reading={readings[word]} />} />;
}
