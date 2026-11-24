import type { ReactNode } from "react";
import { ListRow } from "../ListRow.tsx";
import { SettingsReading } from "./SettingsReading.tsx";
import type { Reading } from "./vocabulary.ts";

export type SettingsFactRowProps = {
  /** The fact, in a few words. */
  title: string;
  /** An icon for the fact; decorative. */
  icon?: ReactNode;
  /** What the phone last said about it. */
  reading: Reading;
};

/**
 * One fact of the phone, such as the battery or Alpha's version, read and not changeable here.
 * @model spec/app/settings/facts.md
 */
export function SettingsFactRow({ title, icon, reading }: SettingsFactRowProps) {
  return <ListRow title={title} leading={icon} detail={<SettingsReading reading={reading} />} />;
}
