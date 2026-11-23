// spec/shell/overview.md, "Story: See my day on Home"; spec/shell/overview.md, "Calendar's Home card stands in for the event card, after an overdue reminder"
import { CalendarDays, Mail, Sparkles, Video, Workflow } from "lucide-react";
import type { ReactNode } from "react";
import type { Overview } from "../../../gen/shell__overview.ts";
import { attentionCard, briefCard, dateShown, ownAgendaCard, setupLink, workflowsCard } from "../../../gen/shell__overview.ts";
import type { AppId } from "../app-screen.ts";
import { Button } from "../components/ui/index.ts";
import { cn, focusRing } from "../lib/cn.ts";
import { agendaCopy, attentionCopy, briefCopy, dateLabel, workflowsCopy } from "./overviewCopy.ts";

/** The daily overview cards and the agenda slot that replaces the event card. */
export interface OverviewCardsProps {
  /** The overview machine's state. */
  overview: Overview;
  /** Calendar's card of the next event: it takes the event card's place, and an overdue reminder still comes first. */
  agenda?: ReactNode;
  /** Opens the app a card stands for. */
  onOpen: (app: AppId) => void;
}

interface CardShellProps {
  label: string;
  description: string;
  icon: ReactNode;
  card: string;
  state: string;
  onOpen: () => void;
  children: ReactNode;
}

function CardShell({ label, description, icon, card, state, onOpen, children }: CardShellProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-description={description || undefined}
      data-overview-card={card}
      data-overview-state={state}
      onClick={onOpen}
      className={cn(focusRing, "flex min-h-28 w-64 shrink-0 snap-start flex-col gap-2 rounded-xl bg-card p-4 text-left text-card-foreground")}
    >
      <span aria-hidden className="text-muted-foreground">{icon}</span>
      {children}
    </button>
  );
}

/**
 * Home's daily overview: the cards that have something to show, or the date with a Gmail setup link.
 * @model spec/shell/overview.md
 */
export function OverviewCards({ overview, agenda, onOpen }: OverviewCardsProps) {
  const agendaText = agendaCopy(overview);
  const calendarCard = agenda !== undefined;
  const ownAgenda = ownAgendaCard(overview, calendarCard);
  if (dateShown(overview, calendarCard)) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4 px-5" data-alpha-home-date>
          <p className="font-display text-3xl">{dateLabel(overview.now)}</p>
          {setupLink(overview) && <Button variant="ghost" size="sm" onClick={() => onOpen("account")}>Set up Gmail</Button>}
        </div>
        {agenda !== undefined && <div className="flex px-5">{agenda}</div>}
      </div>
    );
  }
  const mail = attentionCopy(overview);
  const brief = briefCopy(overview);
  const flows = workflowsCopy(overview);
  return (
    <div className="flex snap-x gap-3 overflow-x-auto px-5 pb-1" role="list" aria-label="Today">
      {ownAgenda && (
        <CardShell card="agenda" state={agendaText.overdue ? "overdue" : agendaText.stale ? "stale" : "item"} label={agendaText.label}
          description={agendaText.description} icon={<CalendarDays className="size-5" />} onOpen={() => onOpen(agendaText.overdue ? "reminders" : "calendar")}>
          <span className={cn("font-mono text-xs uppercase tracking-widest", agendaText.overdue ? "text-destructive" : "text-muted-foreground")}>{agendaText.heading}</span>
          <span className="line-clamp-2 text-lg">{agendaText.title}</span>
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            {agendaText.video && <Video aria-label="Video call" className="size-4" />}
            {agendaText.footer}
            {agendaText.read && <span className="text-warn">{agendaText.read}</span>}
          </span>
          {agendaText.next && <span className="truncate text-sm text-muted-foreground">{agendaText.next}</span>}
        </CardShell>
      )}
      {agenda}
      {attentionCard(overview) && (
        <CardShell card="attention" state={overview.attention === "AttentionStale" ? "stale" : "ready"} label={mail.label} description={mail.status}
          icon={<Mail className="size-5" />} onOpen={() => onOpen("inbox")}>
          <span className="font-display text-4xl tabular-nums">{mail.count}</span>
          <span className={cn("text-sm", overview.attention === "AttentionStale" ? "text-warn" : "text-muted-foreground")}>{mail.status}</span>
        </CardShell>
      )}
      {briefCard(overview) && (
        <CardShell card="brief" state={brief.failed ? "failed" : "ready"} label={brief.label} description={brief.status}
          icon={<Sparkles className="size-5" />} onOpen={() => onOpen("workflows")}>
          <span className="line-clamp-3">{brief.title}</span>
          <span className={cn("text-sm", brief.failed ? "text-destructive" : "text-muted-foreground")}>{brief.status}</span>
        </CardShell>
      )}
      {workflowsCard(overview) && (
        <CardShell card="workflows" state="ready" label={flows.label} description={flows.status} icon={<Workflow className="size-5" />} onOpen={() => onOpen("workflows")}>
          <span className="font-display text-4xl tabular-nums">{flows.count}</span>
          <span className="text-sm text-muted-foreground">{flows.status}</span>
        </CardShell>
      )}
    </div>
  );
}
