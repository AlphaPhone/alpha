// spec/workflows/agentSchedules.md, "Story: Answer a scheduled item from Workflows"; spec/workflows/agentSchedules.md, "Story: Save and run a prompt my agent sends on a schedule"; spec/workflows/automations.md, "A change is held before it is sent, one per owner, and needs the row it names"
import { useState } from "react";
import type { Row } from "../../../gen/workflows__automations.ts";
import { historyNeedsReason, historyWord, reminderVerbOffered, verbOffered, type TaskStatus, type Verb } from "../../../gen/workflows__agentSchedules.ts";
import type { PromptRunLine, Report } from "../../workflows/automations.vibe";
import { Button, Input, Label, Switch, Textarea } from "../components/ui/index.ts";
import { ReviewDialog } from "./ReviewDialog.tsx";
import { reportWords, scheduleText, scheduledTitle, when } from "./words.ts";

/** What one automation shows and the changes it offers. */
export interface AutomationDetailProps {
  row: Row;
  /** Whether a change may be held now: nothing is in flight or held for this owner. */
  canChange: boolean;
  /** The prompt's run history, newest first. */
  history?: ReadonlyArray<PromptRunLine>;
  /** What the last change of this row reported. */
  report?: Report;
  onSwitch: (on: boolean) => void;
  onRun: () => void;
  onVerb: (verb: Verb) => void;
  onSnooze: () => void;
  onEdit: (instructions: string, minuteOfDay?: number) => void;
  onDelete: () => void;
  onEditPrompt: () => void;
}

type Pending = { kind: "switch"; on: boolean } | { kind: "run" } | { kind: "verb"; verb: Verb } | { kind: "snooze" } | { kind: "delete" } | { kind: "edit" };

const taskStatus: Record<string, TaskStatus> = {
  scheduled: "TaskScheduled", snoozed: "TaskScheduled", paused: "TaskScheduled", fired: "TaskFired", acknowledged: "TaskAcknowledged",
  completed: "TaskCompleted", dismissed: "TaskDismissed", skipped: "TaskSkipped", expired: "TaskExpired", failed: "TaskFailed",
};
const verbWords: Partial<Record<Verb, string>> = { Fire: "Run now", Edit: "Edit schedule", Snooze: "Snooze 10 minutes", Complete: "Complete", Dismiss: "Dismiss", Reopen: "Reopen" };
const verbReview: Partial<Record<Verb, string>> = {
  Complete: "Complete marks this item done; it won’t come back.", Dismiss: "Dismiss ends this item without doing it.",
  Reopen: "Reopen schedules this item again.", Fire: "Run this item now, once.",
};
const historyWords = { HistoryRan: "Ran", HistoryFailed: "Failed", HistorySkipped: "Skipped", HistoryUnknown: "Outcome unknown" } as const;

/**
 * One automation, with exactly the controls its kind and status offer, each reviewed before it is sent.
 * @model spec/workflows/automations.md
 * @design design.md
 */
export function AutomationDetail({ row, canChange, history, report, onSwitch, onRun, onVerb, onSnooze, onEdit, onDelete, onEditPrompt }: AutomationDetailProps) {
  const [pending, setPending] = useState<Pending | undefined>(undefined);
  const [instructions, setInstructions] = useState(row.description);
  const [time, setTime] = useState("");
  const status = taskStatus[row.status] ?? "TaskOther";
  const schedule = row.kind === "ScheduleRow";
  const switchable = row.kind === "PromptRow" || row.kind === "RoutineRow";
  // spec/workflows/agentSchedules.md: a reminder is a scheduled item that offers Snooze, Complete and Dismiss, then Reopen.
  const verbs = schedule ? (["Fire", "Edit", "Snooze", "Complete", "Dismiss", "Reopen"] as const).filter((v) => verbOffered(status, v))
    : row.kind === "ReminderRow" ? (["Snooze", "Complete", "Dismiss", "Reopen"] as const).filter((v) => reminderVerbOffered(status, v)) : [];
  const confirm = () => {
    const chosen = pending;
    setPending(undefined);
    if (chosen === undefined) return;
    switch (chosen.kind) {
      case "switch": return onSwitch(chosen.on);
      case "run": return onRun();
      case "verb": return chosen.verb === "Snooze" ? onSnooze() : onVerb(chosen.verb);
      case "snooze": return onSnooze();
      case "delete": return onDelete();
      case "edit": {
        const match = /^(\d{2}):(\d{2})$/.exec(time);
        return onEdit(instructions, match ? Number(match[1]) * 60 + Number(match[2]) : undefined);
      }
    }
  };
  const name = schedule ? scheduledTitle(row.title) : row.title;
  return (
    <article aria-label={name} className="flex flex-col gap-4 px-4">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-display text-2xl">{name}</h2>
          <p className="text-sm text-muted-foreground">{scheduleText(row.schedule)}</p>
        </div>
        {switchable && (
          <Switch aria-label={row.enabled ? "Turn off" : "Turn on"} checked={row.enabled} disabled={!canChange} className="min-h-12 min-w-12"
            onCheckedChange={(on) => setPending({ kind: "switch", on })} />
        )}
      </header>
      {row.description && !schedule && <p className="whitespace-pre-wrap">{row.description}</p>}
      {report?.word !== undefined && <p role="status" className="text-sm">{reportWords[report.word]}</p>}
      <div className="flex flex-wrap gap-2">
        {row.kind === "PromptRow" && <Button size="lg" disabled={!canChange} onClick={() => setPending({ kind: "run" })}>Run now</Button>}
        {row.kind === "PromptRow" && <Button size="lg" variant="outline" disabled={!canChange} onClick={onEditPrompt}>Change</Button>}
        {verbs.map((verb) => (
          <Button key={verb} size="lg" variant={verb === "Fire" || verb === "Reopen" ? "primary" : "outline"} disabled={!canChange}
            onClick={() => setPending(verb === "Edit" ? { kind: "edit" } : { kind: "verb", verb })}>{verbWords[verb]}</Button>
        ))}
        {(row.kind === "PromptRow" || row.kind === "RoutineRow") && (
          <Button size="lg" variant="ghost" disabled={!canChange} onClick={() => setPending({ kind: "delete" })}>Delete</Button>
        )}
      </div>
      {history !== undefined && history.length > 0 && (
        <ol aria-label="Run history" className="flex flex-col gap-1 text-sm">
          {history.map((run, index) => (
            <li key={index} className="flex justify-between gap-3">
              <span>{when(run.at)}</span>
              <span className={historyNeedsReason(run.status, run.error !== undefined) ? "text-destructive" : "text-muted-foreground"}>{historyWords[historyWord(run.status)]}</span>
            </li>
          ))}
        </ol>
      )}
      <ReviewDialog open={pending !== undefined} confirm={pending?.kind === "delete" ? "Delete" : pending?.kind === "edit" ? "Save" : "Confirm"}
        destructive={pending?.kind === "delete"} disabled={pending?.kind === "edit" && instructions.trim() === ""}
        title={pending?.kind === "switch" ? (pending.on ? `Turn on ${name}?` : `Turn off ${name}?`) : pending?.kind === "run" ? `Run ${name} now?`
          : pending?.kind === "delete" ? `Delete ${name}?` : pending?.kind === "edit" ? "Edit schedule" : pending?.kind === "snooze" ? `Snooze until ${when(Date.now() + 600000)}` : name}
        onConfirm={confirm} onCancel={() => setPending(undefined)}>
        {pending?.kind === "verb" && verbReview[pending.verb] !== undefined && <p>{verbReview[pending.verb]}</p>}
        {pending?.kind === "edit" && (
          <div className="flex flex-col gap-3">
            <Label htmlFor="schedule-instructions">Instructions</Label>
            <Textarea id="schedule-instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
            {row.schedule.startsWith("cron:") && (
              <>
                <Label htmlFor="schedule-time">Time</Label>
                <Input id="schedule-time" type="time" step={60} value={time} onChange={(e) => setTime(e.target.value)} />
                <p className="text-sm text-muted-foreground">The days and time zone stay as they are.</p>
              </>
            )}
          </div>
        )}
      </ReviewDialog>
    </article>
  );
}
