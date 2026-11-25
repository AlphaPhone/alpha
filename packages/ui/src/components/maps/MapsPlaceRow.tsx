import type { ComponentProps, ReactNode } from "react";
import { cn, focusRing } from "../../lib/cn.ts";

export type MapsPlaceRowProps = Omit<ComponentProps<"button">, "children"> & {
  /** The place's name. */
  name: string;
  /** What else is known: its kind, where it is. */
  detail?: string;
  /** Its icon, in a round well before the name; decorative. */
  icon: ReactNode;
};

/** A place on the search sheet: a result, a saved place or a recent search, opened with one press. */
export function MapsPlaceRow({ name, detail, icon, className, ...props }: MapsPlaceRowProps) {
  return (
    <button type="button" className={cn(focusRing, "flex w-full items-center gap-3.5 px-5 py-2.5 text-left active:bg-accent disabled:opacity-50", className)} {...props}>
      <span aria-hidden className="flex size-10.5 shrink-0 items-center justify-center rounded-full bg-secondary [&_svg]:size-5">{icon}</span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-body leading-tight font-semibold">{name}</span>
        {detail ? <span className="truncate text-meta leading-tight text-muted-foreground">{detail}</span> : null}
      </span>
    </button>
  );
}
