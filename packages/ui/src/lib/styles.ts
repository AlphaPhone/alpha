import { cn, focusRing } from "./cn.ts";

/** Leave the last scrolling content clear of Ask Alpha and the bottom system inset. */
export const dockClearance = "pb-[calc(var(--alpha-dock-overlap,5.75rem)+--spacing(4)+env(safe-area-inset-bottom))] scroll-pb-[calc(var(--alpha-dock-overlap,5.75rem)+--spacing(4)+env(safe-area-inset-bottom))]";

/** The look of a field a person types or chooses in; a single-line one is 48px, as tall as a `Button`. */
export const field = cn(
  focusRing,
  "w-full rounded-lg border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:focus-visible:outline-destructive",
);

/** The panel of a menu or of a select's list, floating over the page. */
export const floatingPanel = cn("z-dialog rounded-tile border border-border bg-popover text-popover-foreground shadow-md outline-none motion-safe:animate-drop");

/** One row of such a panel: 48px, lit under the pointer and the keyboard. */
export const floatingRow = cn(
  "flex min-h-12 cursor-default items-center gap-3 rounded-md px-3 py-2 text-base outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent",
);

/** The dimmed page behind a dialog or a sheet. */
export const overlay = cn("fixed inset-0 bg-foreground/20 motion-safe:animate-fade dark:bg-background/60");

/** The panel of a dialog, in the middle of the dimmed page. */
export const dialogPanel = cn("fixed inset-x-4 top-1/2 z-dialog mx-auto flex max-w-sm -translate-y-1/2 flex-col gap-4 rounded-tile bg-popover p-5 text-popover-foreground shadow-md outline-none motion-safe:animate-rise");

/** The heading of a floating surface: a dialog or a sheet. */
export const surfaceTitle = cn("text-xl leading-snug font-semibold");

/** What a floating surface asks or says, under its heading. */
export const surfaceDescription = cn("text-base text-muted-foreground");

/** A 44px target around the 24px mark of a checkbox or a radio button. */
export const markTarget = cn(focusRing, "group peer inline-flex size-11 shrink-0 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-50");

/** The round mark of a radio button: a ring that takes the accent when chosen. A checkbox's mark is square. */
export const radioMark = cn("flex size-6 items-center justify-center rounded-full border-2 border-input bg-background transition-colors duration-fast ease-standard group-data-[state=checked]:border-primary");
