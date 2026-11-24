import { Skeleton } from "../Skeleton.tsx";
import { StatusDot } from "../StatusDot.tsx";
import type { Reading } from "./vocabulary.ts";

export type SettingsReadingProps = {
  /** What the phone said: nothing yet, that it could not read the fact, or the value. */
  reading: Reading;
};

/**
 * What a row says about a fact of the phone: a placeholder while the answer is awaited, "Unavailable" when the phone
 * could not say, otherwise the value as reported, beside its state when it has one. Never a guess.
 * @model spec/app/settings/facts.md
 */
export function SettingsReading({ reading }: SettingsReadingProps) {
  if (reading.word === "waiting") {
    return (
      <span aria-busy>
        <Skeleton className="inline-block h-4 w-16 align-middle" />
        <span className="sr-only">Reading</span>
      </span>
    );
  }
  if (reading.word === "unavailable") return <span>Unavailable</span>;
  return reading.status ? <StatusDot status={reading.status} label={reading.value} showLabel className="text-muted-foreground" /> : <span>{reading.value}</span>;
}
