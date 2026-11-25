// spec/app/files/scan.md, "Story: Arrange the pages"; spec/app/files/scan.md, "Story: Make the PDF, and keep the photo"
import { cn } from "@repo/ui";

/** The scanner's dialogs: a card centred on the screen, 20px in, its parts 16px apart. */
export const scanPanel = cn("top-1/2 bottom-auto max-h-[calc(100dvh_-_24px)] -translate-y-1/2 gap-4 rounded-panel p-5 text-md leading-details");

/** A scanner dialog's heading. */
export const scanTitle = cn("font-display text-review-title font-light");

/** A scanner dialog's text button: half a row wide, until its label needs more. */
export const scanButton = cn("h-auto min-h-11 min-w-0 flex-1 basis-36 rounded-panel bg-secondary px-4 py-3 text-md leading-row font-medium whitespace-normal text-secondary-foreground hover:bg-accent");

/** The dialog's main action in its foot. */
export const scanPrimary = cn(scanButton, "bg-alpha text-alpha-foreground hover:bg-alpha/90");

/** A further action beside it in the foot, with no fill. */
export const scanQuiet = cn(scanButton, "bg-transparent text-foreground");

/** The foot of a scanner dialog: its actions under a rule. */
export const scanActions = cn("flex shrink-0 flex-wrap gap-2 border-t border-border pt-3");

/** A 44px icon button on a page. */
export const scanIcon = cn("size-11 rounded-sm bg-secondary text-secondary-foreground [&_svg]:size-5");

/** A line of text read from a page, to correct. */
export const scanText = cn("block min-h-11 w-full rounded-sm border border-border bg-card p-2 text-md leading-details");
