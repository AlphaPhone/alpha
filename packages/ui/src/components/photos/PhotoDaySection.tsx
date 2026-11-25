import type { ReactNode } from "react";

export type PhotoDaySectionProps = {
  /** The day the items were taken: Today, Yesterday, a weekday or a date. */
  label: string;
  /** The day's thumbnails, as a `PhotoGrid`. */
  children?: ReactNode;
};

/** One day of the Library: its name, held at the top while its thumbnails scroll under it. */
export function PhotoDaySection({ label, children }: PhotoDaySectionProps) {
  return (
    <section aria-label={label}>
      <div className="sticky -top-3 z-10 flex h-8.75 items-baseline justify-between gap-2 bg-background px-4 pt-2.5 pb-2">
        <h2 className="text-base leading-snug font-semibold">{label}</h2>
      </div>
      {children}
    </section>
  );
}
