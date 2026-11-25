// spec/app/workflows/sheet.md, "Story: See a workflow's history"; spec/app/workflows/sheet.md, "Story: Read a run's sheet"
import type { WorkflowRun } from "@elizaos/plugin-workflow-client";
import { Effect } from "effect";
import { Alert, Button, Spinner, cn, focusRing } from "@repo/ui";
import { Check, ChevronRight, CircleAlert, Clock, Minus, Play, Sparkles, Square, Volume2, VolumeX, X } from "lucide-react";
import { type Event, newerVersion } from "../../gen/app__workflows__sheet.ts";
import { useMachine } from "../../gen/app__workflows__sheet.react.ts";
import type { Machine } from "../../gen/app__workflows__sheet.effect.vibe";
import type { Machine as WorkflowMachine } from "../../gen/app__workflows.effect.vibe";
import type { Machine as RunsMachine } from "../../gen/app__workflows__runs.effect.vibe";
import type { Machine as ApprovalsMachine } from "../../gen/app__workflows__approvals.effect.vibe";
import type { ApprovalWords } from "./approvals.vibe";
import type { Status } from "../../gen/app__workflows__runs.ts";
import type { Resident, Shown } from "../runtime/area.tsx";
import { HistoryWordsPort, canSpeak } from "./history.vibe";
import type { WorkflowRow } from "./list.vibe";
import type { DefinitionWords } from "./lifecycle.vibe";
import { Lifecycle, LifecyclePower, LifecycleReview } from "./Lifecycle.tsx";
import { RunButton, RunControls } from "./RunControls.tsx";
import { Approval } from "./Approval.tsx";

const labels = { NoRun: "", Running: "Running", Done: "Finished", Failed: "Failed", Stopped: "Stopped", Missed: "Missed", Skipped: "Skipped", Interrupted: "Outcome unknown" } satisfies Record<Status, string>;
const waiting = "Waiting for approval";
/** A run's status glyph in its small round badge. */
function StatusBadge({ status, waits, className }: { readonly status: Status; readonly waits: boolean; readonly className: string }) {
  const Icon = waits ? Clock : icons[status];
  return <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-full bg-secondary", className)}><Icon /></span>;
}
const icons = { NoRun: Minus, Running: Play, Done: Check, Failed: X, Stopped: Square, Missed: Clock, Skipped: Minus, Interrupted: CircleAlert };
const dates = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const shownDate = (value: number) => Number.isFinite(value) ? dates.format(value) : "";

const eventLabels = new Map([
  ["RunStarted", "Run started"],
  ["RunFinished", "Run finished"],
  ["RunFailed", "Run failed"],
  ["RunCancelled", "Run cancelled"],
  ["RunContinuedAsNew", "Continued as a new run"],
  ["NodeStarted", "Step started"],
  ["NodeFinished", "Step finished"],
  ["NodeFailed", "Step failed"],
  ["NodeSkipped", "Step skipped"],
  ["NodeRetrying", "Step retried"],
  ["ApprovalRequested", "Approval requested"],
  ["ApprovalGranted", "Approved"],
  ["ApprovalDenied", "Denied"],
  ["TimerCreated", "Timer set"],
  ["TimerFired", "Timer went off"],
  ["TimerCancelled", "Timer cancelled"],
  ["progress", "Progress"],
]);

const reconciliationText = {
  "worker-running": "Your agent is checking whether this run is still going.",
  "outcome-unknown": "Your agent couldn’t tell how this run ended.",
} satisfies Record<NonNullable<WorkflowRun["reconciliation"]>["state"], string>;

function errorText(run: WorkflowRun): string {
  if (run.reconciliation !== undefined) return reconciliationText[run.reconciliation.state];
  return run.status === "cancelled" ? "This run was cancelled before it finished." : "This run stopped with an error on your agent.";
}

function RunTime({ at }: { readonly at: string }) {
  const formatted = shownDate(Date.parse(at));
  return formatted ? <time dateTime={at}>{formatted}</time> : null;
}

function RunActivity({ run, status }: { readonly run: WorkflowRun; readonly status: string }) {
  const items = [
    { key: "execution", label: "Execution", value: run.id },
    { key: "version", label: "Version", value: run.versionId },
    { key: "status", label: "Status", value: status },
    ...(run.reconciliation ? [{ key: "reconciliation", label: "Reconciliation", value: reconciliationText[run.reconciliation.state] }] : []),
    ...(run.stoppedAt ? [{ key: "stopped", label: "Stopped", value: <RunTime at={run.stoppedAt} /> }] : []),
    ...run.events.map(({ type, at, node }, index) => ({
      key: `event/${index}/${type}/${at}`,
      label: eventLabels.get(type) ?? "Step update",
      value: <><RunTime at={at} />{node && <span>{node}</span>}</>,
    })),
  ];
  return (
    <details aria-label="Workflow execution details" className="my-6 text-sm leading-chat wrap-anywhere">
      <summary className={cn(focusRing, "min-h-11 cursor-pointer py-3 font-semibold")}>Details</summary>
      <dl className="mt-2">
        {items.map(({ key, label, value }) => (
          <div key={key} className="border-t border-border py-2.5">
            <dt className="text-caption leading-chat text-muted-foreground">{label}</dt>
            <dd className="mt-1 flex min-w-0 flex-wrap gap-x-2 whitespace-pre-wrap select-text">{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

interface HistoryProps extends Pick<Shown<Resident | HistoryWordsPort | Machine | WorkflowMachine | DefinitionWords | RunsMachine | ApprovalsMachine | ApprovalWords>, "runtime"> {
  readonly row: WorkflowRow;
  readonly owner: number;
}

/** The header switch of the workflow shown, reviewed against the runs the agent last listed. */
export function WorkflowPower({ runtime, row, owner }: HistoryProps) {
  const sheet = useMachine(runtime);
  const state = sheet.state;
  if (state === undefined || state.owner !== owner || state.runId > 0) return null;
  const history = runtime.runSync(Effect.flatMap(HistoryWordsPort, (words) => words.view(owner, row.number)));
  return <LifecyclePower runtime={runtime} row={row.number} owner={owner} title={row.title}
    unfinished={state.history.status !== "Loaded" || history.all.some((run) => run.status === "Running")}
    interrupted={history.all[0]?.status === "Interrupted"} />;
}

/** The run history and the sheet of an exact run, as the agent last read them. */
export function History({ runtime, row, owner }: HistoryProps) {
  const sheet = useMachine(runtime);
  const state = sheet.state;
  if (state === undefined || state.owner !== owner) return <Spinner aria-label="Reading runs" />;
  const history = runtime.runSync(Effect.flatMap(HistoryWordsPort, (words) => words.view(owner, row.number)));
  const opened = history.opened?.number === state.runId ? history.opened : undefined;
  const send = (event: Event) => { if (sheet.can(event)) void sheet.send(event); };
  if (state.runId > 0) {
    const waits = opened?.raw.status === "waiting-approval";
    const status = waits ? waiting : labels[state.status];
    return (
      <section aria-label="Run details" className="-mx-4 px-6">
        <h2 className="font-display text-headline font-light wrap-anywhere">{row.title}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2.5 text-base">
          <StatusBadge status={state.status} waits={waits} className="size-6 [&_svg]:size-3.25" />
          <strong className="font-semibold">{status}</strong>
          {opened && <span className="text-muted-foreground">
            {opened.raw.occurrence && "Scheduled "}
            <RunTime at={opened.raw.occurrence?.scheduledAt ?? opened.raw.startedAt} />
          </span>}
        </div>
        {newerVersion(state) && <p className="mt-4 flex items-center gap-1.5 text-sm leading-chat text-muted-foreground"><Clock aria-hidden className="size-3.5" />This workflow has changed since this run.</p>}
        {state.output.status === "Loading" && !opened && <Spinner aria-label="Reading the run" />}
        {state.output.status === "Failed" && <Alert variant="warn" role="status" className="mt-4">
          {opened ? "The run could not be refreshed." : "The run could not be read."}
          {sheet.can({ type: "refreshRun" }) && <Button variant="secondary" onClick={() => send({ type: "refreshRun" })}>Retry</Button>}
        </Alert>}
        {opened?.raw.reconciliation?.state === "outcome-unknown"
          ? <p role="status" className="mt-4 text-sm leading-chat">Your agent couldn’t tell how this run ended. Check before running it again.</p>
          : opened?.raw.error && <p role="status" className="mt-4 text-sm leading-chat">{errorText(opened.raw)}</p>}
        <Approval runtime={runtime} run={state.runId} owner={owner} {...(opened ? { approvals: opened.approvals } : {})} />
        {state.text === "Empty" && <p className="mt-4 text-sm text-muted-foreground">No output</p>}
        {opened?.raw.output && (state.text === "Text" || state.text === "Truncated") &&
          <div className="mt-5.5 rounded-panel bg-secondary px-5 py-4.5 font-display text-xl leading-detail font-light whitespace-pre-wrap break-words">{opened.raw.output}</div>}
        {state.text === "Truncated" && <p className="mt-4 text-sm text-muted-foreground">Only the start of the output is shown.</p>}
        {opened && <RunActivity key={opened.raw.id} run={opened.raw} status={status} />}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {opened && sheet.can({ type: "askAbout" }) && <button type="button" onClick={() => send({ type: "askAbout" })}
            className={cn(focusRing, "flex min-h-12 items-center gap-2 rounded-chip bg-secondary pr-4.5 pl-3.5 text-sm font-semibold")}><Sparkles aria-hidden className="size-4.5" />Ask Alpha</button>}
          {canSpeak() && sheet.can({ type: "readAloud" }) && <button type="button" onClick={() => send({ type: "readAloud" })}
            className={cn(focusRing, "flex min-h-12 items-center gap-2 rounded-chip bg-secondary pr-4.5 pl-3.5 text-sm font-semibold")}><Volume2 aria-hidden className="size-4.5" />Read aloud</button>}
          {sheet.can({ type: "stopSpeech" }) && <button type="button" onClick={() => send({ type: "stopSpeech" })}
            className={cn(focusRing, "flex min-h-12 items-center gap-2 rounded-chip bg-secondary pr-4.5 pl-3.5 text-sm font-semibold")}><VolumeX aria-hidden className="size-4.5" />Stop reading</button>}
          <span className="grow" />
          {sheet.can({ type: "closeRun" }) && <button type="button" onClick={() => send({ type: "closeRun" })}
            className={cn(focusRing, "flex min-h-11 items-center gap-2 rounded-full bg-primary px-4.5 text-sm font-semibold text-primary-foreground")}>Done</button>}
        </div>
      </section>
    );
  }
  const description = row.kind === "Routine" ? history.workflow?.description ?? row.summary : "";
  const occurrences = new Map<string, number>();
  const steps = (history.workflow?.steps ?? (row.kind === "Routine" ? row.record.steps : [])).map((step) => {
    const key = JSON.stringify([step.label, step.description]);
    const occurrence = (occurrences.get(key) ?? 0) + 1;
    occurrences.set(key, occurrence);
    return { ...step, key: `${key}/${String(occurrence)}` };
  });
  const unfinished = state.history.status !== "Loaded" || history.all.some((run) => run.status === "Running");
  const interrupted = history.all[0]?.status === "Interrupted";
  const routine = row.kind === "Routine";
  const status = row.removed ? "Removed" : row.on ? "On" : "Paused";
  const runList = (state.history.status === "Loading" || state.history.status === "Failed" || state.shown > 0) && <section aria-label="Run history" className={cn("flex flex-col", routine && "mt-6.5 border-t border-border pt-2")}>
    {state.history.status === "Loading" && <Spinner aria-label="Reading runs" />}
    {state.history.status === "Failed" && <div className="flex flex-wrap items-center gap-2">
      <Alert variant="warn" role="status">Run history couldn’t be read.</Alert>
      {sheet.can({ type: "readHistory", removed: row.removed }) && <Button variant="secondary" onClick={() => send({ type: "readHistory", removed: row.removed })}>Retry</Button>}
    </div>}
    <ul>
      {history.all.slice(0, state.shown).map((run) => {
        const version = run.raw?.versionId === history.workflow?.versionId ? 1 : 2;
        const open: Event = {
          type: "openRun", runId: run.number, status: run.status, version: 1, newest: version,
        };
        const details = run.raw !== undefined && sheet.can(open);
        const scheduledAt = run.raw?.occurrence?.scheduledAt;
        const title = scheduledAt ? `Scheduled ${shownDate(Date.parse(scheduledAt))}` : shownDate(run.startedAt) || "Run";
        const waits = run.raw?.status === "waiting-approval";
        const detail = waits ? waiting : run.raw ? labels[run.status] : run.error ?? labels[run.status];
        const content = <>
          <StatusBadge status={run.status} waits={waits} className="size-7 [&_svg]:size-3.75" />
          <span className="min-w-0 grow">
            <span className="block text-base">{title}</span>
            <span className="mt-0.5 block truncate text-caption text-muted-foreground">{detail}</span>
          </span>
          {details && <ChevronRight aria-hidden className="size-4.5 shrink-0 text-muted-foreground" />}
        </>;
        return <li key={run.number}>
          {details
            ? <button type="button" aria-label={`${detail} execution`} onClick={() => send(open)} className={cn(focusRing, "flex min-h-15 w-full items-center gap-3.5 text-left")}>{content}</button>
            : <div className="flex min-h-15 items-center gap-3.5">{content}</div>}
        </li>;
      })}
    </ul>
    {sheet.can({ type: "readMore" }) && (
      <Button variant="ghost" onClick={() => send({ type: "readMore" })}>More history</Button>
    )}
  </section>;
  if (!routine) return runList || null;
  return (
    <div className="-mx-4 px-6">
      <h2 className="font-display text-display font-light wrap-anywhere">{row.title}</h2>
      {description !== "" && <p className="mt-3.5 text-lg leading-message text-pretty whitespace-pre-wrap break-words">{description}</p>}
      <LifecycleReview runtime={runtime} row={row.number} owner={owner} unfinished={unfinished} />
      {steps.length > 0 && (
        <ol aria-label="Steps" className="mt-6.5 flex flex-col">
          {steps.map((step, index) => <li key={step.key} className="flex gap-3.5">
            <span className="flex w-8 shrink-0 flex-col items-center">
              <span role="img" aria-label={step.label} className="mt-2.75 grid size-8 shrink-0 place-items-center rounded-full bg-secondary"><Check aria-hidden className="size-4" /></span>
              <span aria-hidden className={cn("w-0.5 grow", index < steps.length - 1 && "bg-border")} />
            </span>
            <span className="mb-2.5 min-w-0 grow rounded-action bg-secondary p-4 text-prose leading-normal wrap-anywhere">
              <span>{step.label}</span>
              {step.description && <span className="block text-sm text-muted-foreground">{step.description}</span>}
            </span>
          </li>)}
        </ol>
      )}
      <Lifecycle runtime={runtime} row={row.number} owner={owner} title={row.title} unfinished={unfinished} interrupted={interrupted}
        status={status} run={!row.removed && <RunButton runtime={runtime} row={row.number} owner={owner} />} />
      <RunControls runtime={runtime} row={row.number} owner={owner} title={row.title} />
      {runList}
    </div>
  );
}
