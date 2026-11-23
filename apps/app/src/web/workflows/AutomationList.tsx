// spec/workflows/automations.md, "Story: See all my automations even when one source fails"; spec/workflows/automations.md, "Story: Change an automation once, even when the answer is lost"; spec/workflows/vocabulary.md, "An automation status Alpha has no word for reads as Unknown, and a snoozed item shows no word"
import { AlertTriangle, Bell, CalendarClock, MessageSquareText, Repeat, Workflow } from "lucide-react";
import type { Automations, Read, Row, RowKind } from "../../../gen/workflows__automations.ts";
import { statusWord } from "../../../gen/workflows__vocabulary.ts";
import { Alert, Button, EmptyState, ListRow, Spinner } from "../components/ui/index.ts";
import { outcomeUnknown, scheduleText, scheduledTitle, statusText } from "./words.ts";

/** The Workflows list as the Automations machine holds it, and what it offers. */
export interface AutomationListProps {
  /** The list as the Automations Machine holds it. */
  list: Automations;
  /** The keys of workflows waiting for the owner's approval. */
  waiting?: ReadonlyArray<string>;
  /** Whether a held change may be released now. */
  canAllowAnother: boolean;
  onOpen: (row: Row) => void;
  onAllowAnother: () => void;
}

const icons: Record<RowKind, typeof Workflow> = { WorkflowRow: Workflow, PromptRow: MessageSquareText, ScheduleRow: CalendarClock, ReminderRow: Bell, RoutineRow: Repeat };

const sourceNames = { automations: "Automations", schedules: "Scheduled items", reminders: "Agent reminders", definitions: "Routines and goals" } as const;

function note(name: string, read: Read): string | undefined {
  switch (read) {
    case "NotOnAgent": return `${name} aren’t available on this agent.`;
    case "NeedsOwner": return `${name} need the original owner connection.`;
    case "RefreshFailed": return `${name} couldn’t refresh. Retry to check the current records.`;
    default: return undefined;
  }
}

function title(row: Row): string {
  if (row.kind === "ScheduleRow") return scheduledTitle(row.title);
  return row.title || (row.kind === "ReminderRow" ? "Reminder" : row.kind === "RoutineRow" ? "Routine" : "Automation");
}

/**
 * Every workflow, prompt, scheduled item, reminder and routine, on first, with a note for each source that did not answer.
 * @model spec/workflows/automations.md
 * @design design.md
 */
export function AutomationList({ list, waiting = [], canAllowAnother, onOpen, onAllowAnother }: AutomationListProps) {
  const notes = [
    note(sourceNames.automations, list.automations), note(sourceNames.schedules, list.schedules),
    note(sourceNames.reminders, list.reminders), note(sourceNames.definitions, list.definitions),
    list.partial ? "Some workflow data or run history couldn’t refresh. Open the workflow to check it before running." : undefined,
  ].filter((text): text is string => text !== undefined);
  const held = list.held.find((h) => h.owner === list.owner);
  const rows = [...list.rows].sort((a, b) => Number(b.enabled) - Number(a.enabled) || title(a).localeCompare(title(b)));
  const loading = list.automations === "NotRead" && rows.length === 0;
  return (
    <section aria-label="Workflows" className="flex flex-col gap-3">
      {notes.map((text) => (
        <Alert key={text} variant="warn" className="flex items-start gap-2 text-sm"><AlertTriangle aria-hidden className="size-4 shrink-0" />{text}</Alert>
      ))}
      {held !== undefined && list.answer === "AnswerUnknown" && (
        <Alert variant="warn" className="flex items-center justify-between gap-3 text-sm">
          <span>{outcomeUnknown}</span>
          <Button variant="outline" size="sm" disabled={!canAllowAnother} onClick={onAllowAnother}>Allow another</Button>
        </Alert>
      )}
      {loading ? <Spinner label="Loading workflows" /> : rows.length === 0 && notes.length === 0 ? (
        <EmptyState title="No workflows yet" icon={<Workflow aria-hidden />} />
      ) : (
        <ul className="flex flex-col">
          {rows.map((row) => {
            const Icon = icons[row.kind];
            const word = statusText(statusWord(row.kind === "ScheduleRow", row.status, row.enabled), row.status);
            const busy = list.busy && held?.key === row.key;
            return (
              <li key={row.key}>
                <ListRow title={title(row)} detail={[scheduleText(row.schedule), waiting.includes(row.target) ? "Waiting for you" : ""].filter(Boolean).join(" · ") || undefined}
                  aria-label={`${title(row)}${word ? `, ${word}` : ""}`} onClick={() => onOpen(row)}
                  leading={<Icon aria-hidden className={row.enabled ? "size-5 text-primary" : "size-5 text-muted-foreground"} />}
                  trailing={busy ? <Spinner label="Saving" /> : <span className="font-mono text-xs uppercase text-muted-foreground">{word}</span>} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
