import { cn, focusRing } from "./cn.ts";

/** Leave the last scrolling content clear of Ask Alpha and the bottom system inset. */
export const dockClearance = "pb-[calc(--spacing(4)+max(var(--alpha-dock-overlap,5.75rem),var(--alpha-native-inset-bottom,0px),env(safe-area-inset-bottom)))] scroll-pb-[calc(--spacing(4)+max(var(--alpha-dock-overlap,5.75rem),var(--alpha-native-inset-bottom,0px),env(safe-area-inset-bottom)))]";

/** The look of a field a person types or chooses in: filled, as develop's are; a single-line one is 48px, as tall as a `Button`. */
export const field = cn(
  "w-full rounded-lg border border-transparent bg-secondary px-3.5 text-md text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
);

/** A field typed in: its caret marks focus, so it draws no ring, as develop's fields draw none. */
export const textField = cn(field, "outline-none");

/** A field chosen from: it has no caret, so keyboard focus draws the ring. */
export const choiceField = cn(focusRing, field, "aria-invalid:focus-visible:outline-destructive");

/** The panel of a menu or of a select's list, floating over the page. */
export const floatingPanel = cn("z-dialog rounded-lg bg-background p-1 text-base text-foreground shadow-menu outline-none motion-safe:animate-drop dark:shadow-menu-dark");

/** One row of such a panel: 44px, lit under the pointer and the keyboard. */
export const floatingRow = cn(
  "flex min-h-11 cursor-default items-center gap-3 rounded-md px-3.5 text-base outline-none select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent",
);

/** The dimmed page behind a dialog or a sheet: it dims at once, without a fade, as v119's scrims do (phone.css:1165, automations.css:70, template.html:114). */
export const overlay = cn("fixed inset-0 bg-foreground/18 dark:bg-background/55");

/** The panel of a dialog: a card held over the foot of the dimmed page, clear of Ask Alpha, as develop's are. */
export const dialogPanel = cn("fixed inset-x-4 bottom-30 z-dialog mx-auto flex max-h-[75dvh] max-w-sm flex-col gap-3 overflow-y-auto rounded-sheet bg-popover px-5 pt-5.5 pb-6 text-popover-foreground outline-none motion-safe:animate-rise");

/** While Ask Alpha is drawn, a sheet and its dimming stop 108px above the foot, as develop's do, so Ask Alpha shows below them. */
export const aboveDock = "in-[body:has([data-alpha-assistant-host]:not([hidden])>[data-alpha-detent])]:bottom-27";

/** The panel of a sheet: it rises from the foot of the dimmed page with rounded top corners; add `aboveDock` to stop it above Ask Alpha. */
export const sheetPanel = cn("fixed inset-x-0 bottom-0 z-sheet mx-auto flex max-h-[min(85dvh,calc(100dvh_-_--spacing(35)))] max-w-xl flex-col rounded-t-sheet outline-none motion-safe:animate-rise");

/** The grab handle at the top of a sheet, drawn before its content so it adds nothing to the content's layout; decorative. */
export const sheetHandle = cn("before:absolute before:top-3 before:left-1/2 before:h-1 before:w-10 before:-translate-x-1/2 before:rounded-full before:bg-muted-foreground/40");

/** The heading of a floating surface, a dialog or a sheet: develop's serif display title. */
export const surfaceTitle = cn("font-display text-surface font-light wrap-anywhere");

/** What a floating surface asks or says, under its heading. */
export const surfaceDescription = cn("text-base leading-normal text-muted-foreground");

/** A 44px target around the 24px mark of a checkbox or a radio button. */
export const markTarget = cn(focusRing, "group peer inline-flex size-11 shrink-0 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-50");

/** The round mark of a radio button: a ring that takes the accent when chosen. A checkbox's mark is square. */
export const radioMark = cn("flex size-6 items-center justify-center rounded-full border-2 border-input bg-background transition-colors duration-fast ease-standard group-data-[state=checked]:border-alpha");
