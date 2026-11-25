import type { ComponentProps, ReactNode } from "react";
import { ChevronLeft, Clock, Minus, Plus, Search, X } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { CalendarHeaderAction } from "./CalendarHeader.tsx";

export type CalendarFormPageProps = ComponentProps<"div"> & {
  /** Leaves the form: Back. */
  onBack: () => void;
  /** Saves; left out while Save is off, which the button then says. */
  onSave?: () => void;
  /** The form's other actions in the header, such as Finish in Android Calendar in place of Save. */
  actions?: ReactNode;
  /** Shows Save as working. */
  saving?: boolean;
};

/** A new or changed event, over the days: Back and Save, then its fields. */
export function CalendarFormPage({ onBack, onSave, actions, saving = false, className, children, ...props }: CalendarFormPageProps) {
  return (
    <div data-alpha-subview="calendar-form" className={cn("absolute inset-0 z-50 flex flex-col bg-background motion-safe:animate-fade", className)} {...props}>
      <div data-host-chrome="" className="flex h-13 shrink-0 items-center gap-0.5 pr-2 pl-2">
        <CalendarHeaderAction aria-label="Back to calendar" onClick={onBack}><ChevronLeft aria-hidden /></CalendarHeaderAction>
        <span className="grow" />
        {actions ?? (
          <button type="button" aria-label="Save event" aria-disabled={!onSave} aria-busy={saving || undefined} onClick={onSave}
            className={cn(focusRing, "h-13 min-w-13 rounded-action px-4.5 text-base leading-plain font-semibold transition-colors duration-base",
              onSave ? "bg-alpha text-alpha-foreground" : "bg-secondary text-muted-foreground")}>Save</button>
        )}
      </div>
      <div role="region" aria-label="Event details" tabIndex={0} className={cn(focusRing, "min-h-0 grow touch-pan-y overflow-x-hidden overflow-y-auto overscroll-contain pt-1 pb-32.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden")}>
        {children}
      </div>
    </div>
  );
}

/** The form's title, in the display face. */
export function CalendarFormTitle({ className, ...props }: ComponentProps<"input">) {
  return (
    <div className="px-6">
      <input aria-label="Title" placeholder="Title" className={cn("w-full border-0 bg-transparent py-1.5 font-display text-display-sm font-light text-foreground outline-none placeholder:text-muted-foreground", className)} {...props} />
    </div>
  );
}

export type CalendarFormDateProps = Omit<ComponentProps<"input">, "type"> & {
  /** The words before the field, such as "Date" or "Ends on". */
  label: string;
  /** Inside a group of fields: smaller words, and the field on the page's own color. */
  inset?: boolean;
};

/** A date field with its words before it. */
export function CalendarFormDate({ label, inset = false, className, ...props }: CalendarFormDateProps) {
  if (inset) {
    return (
      <label className={cn("flex flex-wrap items-center gap-2 py-2 pr-2 text-sm leading-plain", className)}>
        {label}
        <input type="date" className={cn(focusRing, "h-15 min-w-0 flex-1 rounded-option border-0 bg-background p-2 text-foreground")} {...props} />
      </label>
    );
  }
  return (
    <label className={cn("mx-6 my-3 flex flex-wrap items-center gap-3 text-base leading-plain", className)}>
      {label}
      <input type="date" className={cn(focusRing, "h-15 min-w-0 flex-1 rounded-sm border-0 bg-secondary p-2 text-foreground")} {...props} />
    </label>
  );
}

/** One day a new event can be on. */
export interface CalendarFormDay {
  key: number;
  /** "Today", or the weekday. */
  top: string;
  date: number;
  label: string;
  chosen: boolean;
  onPick?: () => void;
}

/** The days to choose from, in a row that scrolls sideways. */
export function CalendarDayChips({ days, className, ...props }: Omit<ComponentProps<"div">, "children"> & { days: ReadonlyArray<CalendarFormDay> }) {
  return (
    <div className={cn("flex touch-pan-x gap-2 overflow-x-auto px-5 pt-3.5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)} {...props}>
      {days.map((day) => (
        <button key={day.key} type="button" aria-label={day.label} aria-pressed={day.chosen} disabled={!day.onPick} onClick={day.onPick}
          className={cn(focusRing, "box-border flex min-h-13 min-w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5",
            day.chosen ? "bg-alpha text-alpha-foreground" : "bg-secondary")}>
          <span className="text-2xs leading-plain font-medium opacity-75">{day.top}</span>
          <span className="text-date font-semibold">{day.date}</span>
        </button>
      ))}
    </div>
  );
}

/** A group of the form's fields on the quiet fill. */
export function CalendarFormCard({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col rounded-lg bg-secondary", className)} {...props} />;
}

export type CalendarTimeRowProps = {
  /** The row's icon, or nothing to keep its place. */
  icon?: ReactNode;
  /** Over the field, such as "7:00 PM · 1 h". */
  caption: string;
  /** The field's name, read aloud. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  earlierLabel: string;
  laterLabel: string;
  onEarlier?: () => void;
  onLater?: () => void;
};

/** A start or end time: its time field, and buttons a quarter of an hour earlier or later. */
export function CalendarTimeRow({ icon, caption, label, value, onChange, earlierLabel, laterLabel, onEarlier, onLater }: CalendarTimeRowProps) {
  const step = cn(focusRing, "inline-flex size-13 shrink-0 items-center justify-center rounded-tile bg-background disabled:opacity-50");
  return (
    <div className="box-border flex min-h-14 items-center gap-3.5 py-1">
      <span aria-hidden className="flex w-6 shrink-0 text-muted-foreground [&_svg]:size-5.5">{icon === undefined ? <Clock /> : icon}</span>
      <span className="min-w-0 flex-[1_1_0] text-sm leading-plain">{caption}
        <input aria-label={label} type="time" step={60} value={value} onChange={(event) => onChange(event.target.value)}
          className="block min-h-11 w-full min-w-0 border-0 bg-transparent text-date text-foreground" />
      </span>
      <button type="button" aria-label={earlierLabel} disabled={!onEarlier} onClick={onEarlier} className={step}><Minus aria-hidden className="size-4.5" /></button>
      <button type="button" aria-label={laterLabel} disabled={!onLater} onClick={onLater} className={step}><Plus aria-hidden className="size-4.5" /></button>
    </div>
  );
}

export type CalendarFormRowProps = ComponentProps<"div"> & {
  /** The row's icon, muted. */
  icon: ReactNode;
};

/** A row of the form: its icon, then its field or choices. */
export function CalendarFormRow({ icon, className, children, ...props }: CalendarFormRowProps) {
  return (
    <div className={cn("flex min-h-12 items-center gap-3.5", className)} {...props}>
      <span aria-hidden className="flex shrink-0 text-muted-foreground [&_svg]:size-5.5">{icon}</span>
      {children}
    </div>
  );
}

export type CalendarChipProps = ComponentProps<"button"> & {
  chosen?: boolean;
  /** A calendar's dot before the words. */
  dot?: "primary" | "foreground";
};

/** One choice of the form, such as a calendar or how often it repeats: filled with the text color once chosen. */
export function CalendarChip({ chosen = false, dot, className, children, ...props }: CalendarChipProps) {
  return (
    <button type="button" aria-pressed={chosen}
      className={cn(focusRing, "box-border flex min-h-13 max-w-full items-center gap-2 rounded-chip px-3 py-1.5 text-left text-snippet leading-plain font-semibold wrap-anywhere disabled:opacity-50",
        dot && "px-3.5", chosen ? "bg-foreground text-background" : "bg-background", className)} {...props}>
      {dot ? <span aria-hidden className={cn("size-2 shrink-0 rounded-full", dot === "primary" ? "bg-primary" : "bg-foreground")} /> : null}
      <span className="min-w-0">{children}</span>
    </button>
  );
}

export type CalendarSwitchProps = Omit<ComponentProps<"button">, "role" | "onChange"> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** What the switch turns on, read aloud. */
  "aria-label": string;
};

/** A switch of the form, such as All day: a 52px track that fills with the text color when on. */
export function CalendarSwitch({ checked, onCheckedChange, className, ...props }: CalendarSwitchProps) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onCheckedChange(!checked)}
      className={cn(focusRing, "flex size-13 shrink-0 items-center justify-center rounded-lg disabled:opacity-50", className)} {...props}>
      <span aria-hidden className={cn("relative block h-8 w-13 rounded-lg transition-colors duration-base", checked ? "bg-foreground" : "bg-accent")}>
        <span className={cn("absolute top-0.75 left-0.75 size-6.5 rounded-full bg-background shadow-sm transition-transform duration-base ease-standard motion-reduce:transition-none", checked && "translate-x-5")} />
      </span>
    </button>
  );
}

const bare = "min-w-0 grow border-0 bg-transparent text-body text-foreground outline-0 placeholder:text-muted-foreground disabled:opacity-50";

export type CalendarFieldRowProps = ComponentProps<"input"> & {
  /** The field's icon, muted, before it. */
  icon: ReactNode;
};

/** A one-line field of the form on the quiet fill, such as Location: its icon, then the field. */
export function CalendarFieldRow({ icon, className, ...props }: CalendarFieldRowProps) {
  return (
    <div className={cn("flex h-14 items-center gap-3.5 rounded-lg bg-secondary px-4", className)}>
      <span aria-hidden className="flex shrink-0 text-muted-foreground [&_svg]:size-5.5">{icon}</span>
      <input className={cn(bare, "h-11.5")} {...props} />
    </div>
  );
}

export type CalendarNotesFieldProps = ComponentProps<"textarea"> & {
  icon: ReactNode;
};

/** The event's notes: its icon, then a field of three lines that grows. */
export function CalendarNotesField({ icon, className, ...props }: CalendarNotesFieldProps) {
  return (
    <div className={cn("flex min-h-14 items-start gap-3.5 rounded-lg bg-secondary px-4 py-3", className)}>
      <span aria-hidden className="flex shrink-0 text-muted-foreground [&_svg]:size-5.5">{icon}</span>
      <textarea rows={3} className={cn(bare, "resize-y leading-plain")} {...props} />
    </div>
  );
}

export type CalendarPickerFieldProps = ComponentProps<"input"> & {
  /** Closes the field. */
  onDone: () => void;
  /** Read aloud for the close button. */
  doneLabel: string;
};

/** A field to find someone or something by name, with a button that closes it: on the page's own color, inside a group. */
export function CalendarPickerField({ onDone, doneLabel, className, ...props }: CalendarPickerFieldProps) {
  return (
    <div className={cn("mt-1.5 flex h-12 items-center gap-2 rounded-lg bg-background pr-1 pl-3.5", className)}>
      <Search aria-hidden className="size-4.5 shrink-0 text-muted-foreground" />
      <input className={cn(bare, "h-11")} {...props} />
      <button type="button" aria-label={doneLabel} onClick={onDone} className={cn(focusRing, "inline-flex size-11 shrink-0 items-center justify-center rounded-tile active:bg-accent")}><X aria-hidden className="size-4.5" /></button>
    </div>
  );
}

export type CalendarSearchBarProps = ComponentProps<"input"> & {
  /** Closes search. */
  onClose: () => void;
};

/** Search over the days, under the header: a quiet pill with its field and Close. */
export function CalendarSearchBar({ onClose, className, ...props }: CalendarSearchBarProps) {
  return (
    <div role="search" className={cn("mx-4 mb-2 flex shrink-0 items-center gap-1 rounded-tile bg-secondary pr-1 pl-3.5", className)}>
      <Search aria-hidden className="size-4.5 shrink-0 text-muted-foreground" />
      <input type="search" enterKeyHint="search" autoComplete="off" className={cn(bare, "h-11 p-0")} {...props} />
      <button type="button" aria-label="Close search" onClick={onClose} className={cn(focusRing, "inline-flex size-11 shrink-0 items-center justify-center rounded-tile active:bg-accent [&_svg]:size-5.5")}><X aria-hidden /></button>
    </div>
  );
}
