import { type ComponentProps, type ReactNode, useState } from "react";
import { ChevronLeft, ChevronRight, Ellipsis } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { CalendarHeaderAction } from "./CalendarHeader.tsx";

export type CalendarEventPageProps = Omit<ComponentProps<"div">, "title"> & {
  title: string;
  /** Back to the days. */
  onBack: () => void;
  /** The event's actions at the top end, such as its Edit and Delete menu. */
  actions?: ReactNode;
  /** When it is, such as "3:00 – 4:00 PM". */
  when: string;
  /** The day, such as "Today", after its calendar's dot. */
  day: string;
  /** Which calendar it is in, after its calendar's dot. */
  source?: string;
  /** The color of its calendar's dot. */
  dot?: "primary" | "foreground";
  /** Its notes, under a rule at the end. */
  notes?: string;
  /** What follows the time: notices, answers, its video call, place and people. */
  children?: ReactNode;
};

/** An event, over the days: Back and its actions, its title, time, day and calendar, then what it holds. */
export function CalendarEventPage({ title, onBack, actions, when, day, source, dot = "primary", notes, className, children, ...props }: CalendarEventPageProps) {
  const dotClass = cn("size-2 shrink-0 rounded-full", dot === "primary" ? "bg-primary" : "bg-foreground");
  return (
    <div data-alpha-subview="calendar-detail" className={cn("absolute inset-0 z-20 flex flex-col bg-background motion-safe:animate-fade", className)} {...props}>
      <div data-host-chrome="" className="flex h-13 shrink-0 items-center gap-0.5 px-2">
        <CalendarHeaderAction aria-label="Back to calendar" onClick={onBack}><ChevronLeft aria-hidden /></CalendarHeaderAction>
        <span className="grow" />
        {actions}
      </div>
      <div className="min-w-0 grow touch-pan-y overflow-y-auto px-6 pt-1 pb-32.5 wrap-anywhere [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <h1 className="m-0 font-display text-display font-light">{title}</h1>
        <div className="mt-3.5 text-lg leading-plain">{when}</div>
        <div className="mt-1 flex items-center gap-2 text-sm leading-plain text-muted-foreground"><span aria-hidden className={dotClass} />{day}</div>
        <div className="mt-2 flex items-center gap-2 text-sm leading-plain text-muted-foreground"><span aria-hidden className={dotClass} />{source}</div>
        {children}
        {notes ? <div className="mt-4.5 border-t border-border pt-4.5 text-prose whitespace-pre-wrap">{notes}</div> : null}
      </div>
    </div>
  );
}

/** The rows of an event's video call, place and alert, 20px under what is above them. */
export function CalendarEventRows({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mt-5 flex flex-col", className)} {...props} />;
}

export type CalendarEventRowProps = Omit<ComponentProps<"div">, "children"> & {
  /** The row's icon, muted. */
  icon: ReactNode;
  /** What the row says, such as the video link or the place. */
  text: string;
  /** At the end, such as Join. */
  trailing?: ReactNode;
  /** Opens what the row names, such as the place in Maps: the row becomes a button with a chevron. */
  onOpen?: () => void;
  /** What opening does, read aloud, such as "Open Tartine in Maps". */
  openLabel?: string;
};

/** One row of an event: its video call, place or alert. */
export function CalendarEventRow({ icon, text, trailing, onOpen, openLabel, className, ...props }: CalendarEventRowProps) {
  const inside = (
    <>
      <span aria-hidden className="flex shrink-0 text-muted-foreground [&_svg]:size-5.5">{icon}</span>
      <span className="min-w-0 grow truncate text-base leading-plain">{text}</span>
      {onOpen ? <ChevronRight aria-hidden className="size-4.5 shrink-0 text-muted-foreground" /> : trailing}
    </>
  );
  if (onOpen) return <button type="button" aria-label={openLabel} onClick={onOpen} className={cn(focusRing, "flex min-h-14 items-center gap-4 rounded-lg text-left", className)}>{inside}</button>;
  return <div className={cn("flex min-h-14 items-center gap-4", className)} {...props}>{inside}</div>;
}

/** The Join button of an event's video call. */
export function CalendarJoin({ className, ...props }: ComponentProps<"button">) {
  return <button type="button" className={cn(focusRing, "h-10 shrink-0 rounded-full bg-alpha px-4.5 text-sm leading-plain font-semibold text-alpha-foreground", className)} {...props} />;
}

export type CalendarPersonProps = Omit<ComponentProps<"div">, "children"> & {
  initials: string;
  name: string;
  /** Their reply in Alpha's words, such as "Maybe", or nothing. */
  status?: string;
};

/** One of an event's people: their initials, name and reply. */
export function CalendarPerson({ initials, name, status, className, ...props }: CalendarPersonProps) {
  return (
    <div aria-label={name} className={cn("flex min-h-13 items-center gap-3", className)} {...props}>
      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs leading-plain font-bold whitespace-nowrap">{initials}</span>
      <span className="grow text-base leading-plain">{name}</span>
      {status ? <span className="text-meta leading-plain text-muted-foreground">{status}</span> : null}
    </div>
  );
}

export type CalendarAnswersProps = ComponentProps<"div"> & {
  /** Who sent the invitation, as initials. */
  initials: string;
};

/** An invitation's answers on its page: who sent it, then Going, Maybe and No. */
export function CalendarAnswers({ initials, className, children, ...props }: CalendarAnswersProps) {
  return (
    <div className={cn("mt-5.5 flex items-center gap-2", className)} {...props}>
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-xs leading-plain font-bold">{initials}</span>
      {children}
    </div>
  );
}

export type CalendarAnswerProps = ComponentProps<"button"> & {
  /** The owner's answer now: Going and Maybe fill with Alpha blue, No with the text color. */
  chosen?: "going" | "declined";
};

/** One answer to an invitation. */
export function CalendarAnswer({ chosen, className, ...props }: CalendarAnswerProps) {
  return (
    <button type="button" className={cn(focusRing, "flex h-11 grow basis-0 items-center justify-center rounded-full text-sm leading-plain font-semibold disabled:opacity-50",
      chosen === "going" ? "bg-alpha text-alpha-foreground" : chosen === "declined" ? "bg-foreground text-background" : "bg-secondary", className)} {...props} />
  );
}

/** A labelled action of an event's page, such as Open in Google Calendar. */
export function CalendarEventAction({ className, ...props }: ComponentProps<"button">) {
  return <button type="button" className={cn(focusRing, "mt-3 flex min-h-11 items-center gap-2 rounded-action bg-secondary px-3.5 font-semibold disabled:opacity-50 [&_svg]:size-4.5", className)} {...props} />;
}

/** One action of an event's menu. */
export interface CalendarEventMenuItem {
  label: string;
  /** Read aloud in place of the label, such as "Edit event". */
  name?: string;
  onSelect: () => void;
}

/** The event's actions, behind the "…" at the top end: a small list that opens under it. */
export function CalendarEventMenu({ items, className, ...props }: Omit<ComponentProps<"div">, "children"> & { items: ReadonlyArray<CalendarEventMenuItem> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("relative z-10", className)} {...props}>
      <CalendarHeaderAction aria-label="Event actions" aria-expanded={open} className="size-11" onClick={() => setOpen(!open)}><Ellipsis aria-hidden /></CalendarHeaderAction>
      {open ? (
        <div role="menu" className="absolute top-full right-0 w-max rounded-lg bg-background p-1 text-foreground shadow-md">
          {items.map((item) => (
            <button key={item.label} type="button" role="menuitem" aria-label={item.name} onClick={() => { setOpen(false); item.onSelect(); }}
              className={cn(focusRing, "block min-h-11 w-full px-3.5 text-start active:bg-accent")}>{item.label}</button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
