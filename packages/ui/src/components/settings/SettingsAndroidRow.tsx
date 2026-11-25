import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { ListRow, type ListRowProps } from "../ListRow.tsx";
import { Spinner } from "../Spinner.tsx";
import { SettingsReading } from "./SettingsReading.tsx";
import type { AndroidStart, AndroidTarget, Reading, SettingsAndroidProps } from "./vocabulary.ts";

export type SettingsAndroidRowProps = SettingsAndroidProps &
  Pick<ListRowProps, "autoFocus" | "onFocus"> & {
    /** The page of Android's settings the row opens. */
    target: AndroidTarget;
    /** For a channel's page, the channel it names. */
    channel?: string;
    /** What the row is, in a few words. */
    title: string;
    /** An icon for the row; decorative. */
    icon?: ReactNode;
    /** What the phone said about the fact the row stands for, under its title. */
    reading?: Reading;
  };

const same = (start: AndroidStart | undefined, target: AndroidTarget, channel: string | undefined) => start?.target === target && start.channel === channel;

/**
 * A row that opens a page of Android's own settings, for what Alpha cannot change itself. One start is in flight at a
 * time: its row spins and the others wait.
 * @model spec/app/settings/android.md
 */
export function SettingsAndroidRow({ target, channel, title, icon, reading, starting, onAndroid, ...props }: SettingsAndroidRowProps) {
  const pressable = onAndroid ? { onClick: () => onAndroid({ target, channel }), disabled: starting !== undefined } : {};
  return (
    <ListRow
      title={title}
      detail={reading ? <SettingsReading reading={reading} /> : undefined}
      leading={icon}
      trailing={same(starting, target, channel) ? <Spinner size="sm" label="Opening" /> : onAndroid ? <ExternalLink role="img" aria-label="Opens in Android settings" className="size-4" /> : null}
      {...pressable}
      {...props}
    />
  );
}
