// spec/settings/vocabulary.md, "Story: See only what Android reported"
import { ChevronRight, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { ListRow, Spinner, Switch } from "../components/ui/index.ts";
import { cn } from "../lib/cn.ts";
import type { StateWord } from "./words.ts";

/** A group of rows under an optional caption. */
export interface SectionProps { readonly caption?: string; readonly children: ReactNode }

/** A group of Settings rows; the caption is a small uppercase label. */
export function Section({ caption, children }: SectionProps) {
  return (
    <section className="flex flex-col gap-1">
      {caption && <h2 className="px-4 font-mono text-xs uppercase tracking-wide text-muted-foreground">{caption}</h2>}
      <div className="overflow-hidden rounded-xl bg-card">{children}</div>
    </section>
  );
}

/** A state word and the token its dot is drawn in. */
export interface StateMarkProps { readonly state: StateWord }

/** A state shown as a dot and its word; the word is the accessible name of the dot. */
export function StateMark({ state }: StateMarkProps) {
  const dot = { ok: "bg-ok", warn: "bg-warn", muted: "bg-muted-foreground", destructive: "bg-destructive" } as const;
  return (
    <span className="inline-flex items-center gap-2">
      {state.tone && <span aria-hidden className={cn("size-2 rounded-full", dot[state.tone])} />}
      {state.word}
    </span>
  );
}

/** A Settings row: a fact, a page in Settings, or a handoff to Android. */
export interface SettingRowProps {
  readonly label: string;
  readonly state?: StateWord;
  /** Opens another Settings page. */
  readonly onOpen?: () => void;
  /** Hands off to Android's own page. */
  readonly onHandoff?: () => void;
  readonly busy?: boolean;
  readonly disabled?: boolean;
  readonly icon?: ReactNode;
  readonly destructive?: boolean;
  /** The accessible name where it says more than the label, such as its destination. */
  readonly ariaLabel?: string;
}

/** One row of a Settings page. */
export function SettingRow({ label, state, onOpen, onHandoff, busy, disabled, icon, destructive, ariaLabel }: SettingRowProps) {
  const act = onOpen ?? onHandoff;
  const trailing = (
    <span className="inline-flex items-center gap-2">
      {state && <StateMark state={state} />}
      {busy ? <Spinner size="sm" aria-hidden /> : onOpen ? <ChevronRight aria-hidden className="size-4" /> : onHandoff ? <ExternalLink aria-hidden className="size-4" /> : null}
    </span>
  );
  const name = ariaLabel ?? (state && state.word ? `${label}, ${state.word}` : label);
  return (
    <ListRow title={<span className={cn(destructive && "text-destructive")}>{label}</span>} leading={icon} trailing={trailing}
      aria-label={name} aria-busy={busy || undefined} disabled={disabled || busy || !act} onClick={act} />
  );
}

/** A switch the owner changes here; locked switches show why through their state. */
export interface ToggleRowProps {
  readonly label: string;
  readonly on: boolean;
  readonly locked?: boolean;
  readonly detail?: string;
  readonly onChange: (on: boolean) => void;
}

/** A Settings switch that takes effect at once. */
export function ToggleRow({ label, on, locked, detail, onChange }: ToggleRowProps) {
  return (
    <label className="flex min-h-14 items-center gap-3 px-4 py-2">
      <span className="min-w-0 flex-1">
        <span className="block">{label}</span>
        {detail && <span className="block text-sm text-muted-foreground">{detail}</span>}
      </span>
      <Switch checked={on} disabled={locked} aria-label={label} onCheckedChange={onChange} />
    </label>
  );
}
