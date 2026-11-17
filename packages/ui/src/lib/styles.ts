import { cn, focusRing } from "./cn.ts";

/** The look of a field a person types or chooses in. */
export const field = cn(
  focusRing,
  "w-full rounded-lg border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive",
);

/** The panel of a menu or of a select's list, floating over the page. */
export const floatingPanel = cn("z-dialog rounded-tile border border-border bg-popover text-popover-foreground shadow-md outline-none motion-safe:animate-drop");

/** One row of such a panel: 48px, lit under the pointer and the keyboard. */
export const floatingRow = cn(
  "flex min-h-12 cursor-default items-center gap-3 rounded-md px-3 py-2 text-base outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent",
);

/** A 44px target around the 24px mark of a checkbox or a radio button. */
export const markTarget = cn(focusRing, "group peer inline-flex size-11 shrink-0 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-50");

/** The mark itself: a ring that takes the accent when chosen. */
export const mark = cn("flex size-6 items-center justify-center rounded-full border-2 border-input bg-background transition-colors duration-fast ease-standard");
