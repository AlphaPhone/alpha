import type { ComponentProps, ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";

export type CalendarHeaderProps = Omit<ComponentProps<"header">, "title"> & {
  /** The month shown, as the screen's one title. */
  title: string;
  /** Whether the month dialog the title opens is open. */
  expanded?: boolean;
  /** Opens or closes the month dialog; left out, the title only names the month. */
  onTitle?: () => void;
  /** The control that leaves Calendar, usually the shell's back button. */
  leading?: ReactNode;
  /** Calendar's own actions, at the end: Today, search, a new event. */
  children?: ReactNode;
};

/**
 * The top of Calendar: Back, the month that opens the month dialog, and Calendar's actions. On the launcher
 * (`data-alpha-launcher`, the phone's Home) the month is the serif display title, as v121 drew it on the phone.
 */
export function CalendarHeader({ title, expanded = false, onTitle, leading, className, children, ...props }: CalendarHeaderProps) {
  const Chevron = expanded ? ChevronUp : ChevronDown;
  return (
    <header data-host-chrome="" className={cn("flex h-13 shrink-0 items-center gap-0.5 px-2", className)} {...props}>
      {leading}
      <button type="button" aria-label="Choose date" aria-expanded={expanded} disabled={!onTitle} onClick={onTitle}
        className={cn(focusRing, "flex min-h-12 min-w-0 grow items-center gap-1.5 rounded-lg text-left disabled:cursor-default")}>
        <h1 className="m-0 min-w-0 truncate text-xl leading-plain font-semibold in-data-[alpha-launcher]:font-display in-data-[alpha-launcher]:text-3xl in-data-[alpha-launcher]:font-light">{title}</h1>
        <Chevron aria-hidden className="mt-1 size-4.5 text-muted-foreground" />
      </button>
      {children}
    </header>
  );
}

export type CalendarHeaderActionProps = ComponentProps<"button"> & {
  /** What the action does, read aloud: the button shows only its icon. */
  "aria-label": string;
};

/** One icon action of Calendar's header or of an event's page: 52px, with a 22px icon. */
export function CalendarHeaderAction({ className, ...props }: CalendarHeaderActionProps) {
  return (
    <button type="button" className={cn(focusRing, "inline-flex size-13 shrink-0 items-center justify-center rounded-tile active:bg-accent disabled:opacity-50 [&_svg]:size-5.5 [&_svg]:shrink-0", className)} {...props} />
  );
}
