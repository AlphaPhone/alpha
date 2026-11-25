import { cn } from "../../lib/cn.ts";
import { Skeleton } from "../Skeleton.tsx";
import type { StatusDotProps } from "../StatusDot.tsx";
import type { Reading } from "./vocabulary.ts";

export type SettingsReadingProps = {
  /** What the phone said: nothing yet, that it could not read the fact, or the value. */
  reading: Reading;
};

const dots: Record<StatusDotProps["status"], string> = { ok: "bg-ok", warn: "bg-warn", error: "bg-destructive", off: "bg-muted-foreground", busy: "bg-info" };

/**
 * What a row says about a fact of the phone: a placeholder while the answer is awaited, "Unavailable" when the phone
 * could not say, otherwise the value as reported, beside its state when it has one. Never a guess.
 * @model spec/app/settings/facts.md
 */
export function SettingsReading({ reading }: SettingsReadingProps) {
  if (reading.word === "waiting") {
    return (
      <span aria-busy>
        <Skeleton as="span" className="inline-block h-4 w-16 align-middle" />
        <span className="sr-only">Reading</span>
      </span>
    );
  }
  if (reading.word === "unavailable") return <span>Unavailable</span>;
  return reading.status ? (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={cn("size-2 shrink-0 rounded-full", dots[reading.status])} />
      {reading.value}
    </span>
  ) : <span>{reading.value}</span>;
}
