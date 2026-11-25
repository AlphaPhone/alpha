import type { ReactNode } from "react";
import { SettingsReading } from "./SettingsReading.tsx";
import type { Reading } from "./vocabulary.ts";

export type SettingsFactRowProps = {
  /** The fact, in a few words. */
  title: string;
  /** An icon for the fact; decorative. */
  icon?: ReactNode;
  /** What the phone last said about it; a fact with nothing to add, such as "No matches", has none. */
  reading?: Reading;
  /** What the owner should know about it, under the fact, such as a note on a page of steps. */
  description?: string;
};

/**
 * One fact of the phone, such as the battery or Alpha's version, read and not changeable here: the fact, with what the
 * phone said under it, or a note with what to know about it.
 * @model spec/app/settings/facts.md
 */
export function SettingsFactRow({ title, icon, reading, description }: SettingsFactRowProps) {
  return (
    <div className="flex min-h-14.5 items-stretch gap-3.5 px-4.5 py-3 text-foreground">
      {icon ? <span aria-hidden className="flex shrink-0 items-center [&_svg:not([class*='size-'])]:size-5.5">{icon}</span> : null}
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <span className="text-md leading-[normal] break-words">
          {title}
          {description ? <span className="mt-0.5 block text-sm leading-normal text-muted-foreground">{description}</span> : null}
        </span>
        <span className="max-w-full text-caption leading-[1.4] break-words text-muted-foreground">{reading ? <SettingsReading reading={reading} /> : null}</span>
      </span>
    </div>
  );
}
