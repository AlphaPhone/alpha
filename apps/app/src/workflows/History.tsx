// spec/app/workflows/sheet.md, "Story: See a workflow's history"; spec/app/workflows/sheet.md, "Story: Read a run's sheet"
import type { WorkflowRun } from "@elizaos/plugin-workflow-client";
import { Effect } from "effect";
import { Alert, Button, EmptyState, ListRow, Spinner } from "@repo/ui";
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
import { Lifecycle } from "./Lifecycle.tsx";
import { RunControls } from "./RunControls.tsx";
import { Approval } from "./Approval.tsx";

const labels = { NoRun: "", Running: "Running", Done: "Done", Failed: "Failed", Stopped: "Stopped", Missed: "Missed", Skipped: "Skipped", Interrupted: "Outcome unknown" } satisfies Record<Status, string>;
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
    <details aria-label="Workflow execution details" className="rounded-tile border border-border px-4">
      <summary className="min-h-11 cursor-pointer content-center font-medium">Details</summary>
      <dl className="grid gap-3 pb-4 text-sm">
        {items.map(({ key, label, value }) => (
          <div key={key} className="flex flex-wrap items-baseline justify-between gap-x-3">
            <dt className="font-medium">{label}</dt>
            <dd className="flex min-w-0 flex-wrap gap-x-2 break-all text-muted-foreground select-text">{value}</dd>
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

/** The run history and the sheet of an exact run, as the agent last read them. */
export function History({ runtime, row, owner }: HistoryProps) {
  const sheet = useMachine(runtime);
  const state = sheet.state;
  if (state === undefined || state.owner !== owner) return <Spinner aria-label="Reading runs" />;
  const history = runtime.runSync(Effect.flatMap(HistoryWordsPort, (words) => words.view(owner, row.number)));
  const opened = history.opened?.number === state.runId ? history.opened : undefined;
  const send = (event: Event) => { if (sheet.can(event)) void sheet.send(event); };
  if (state.runId > 0) {
    const status = opened?.raw.status === "waiting-approval" ? "Waiting for you" : labels[state.status];
    const Icon = icons[state.status];
    return (
      <section aria-label="Run details" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2"><Icon aria-hidden className="size-5" /><strong>{status}</strong>
          {opened && <span className="text-sm text-muted-foreground">
            {opened.raw.occurrence && "Scheduled "}
            <RunTime at={opened.raw.occurrence?.scheduledAt ?? opened.raw.startedAt} />
          </span>}
        </div>
        {newerVersion(state) && <Alert role="status">This workflow has changed since this run.</Alert>}
        {state.output.status === "Loading" && !opened && <Spinner aria-label="Reading the run" />}
        {state.output.status === "Failed" && <Alert variant="warn" role="status">
          {opened ? "The run could not be refreshed." : "The run could not be read."}
          {sheet.can({ type: "refreshRun" }) && <Button variant="secondary" onClick={() => send({ type: "refreshRun" })}>Retry</Button>}
        </Alert>}
        {opened?.raw.reconciliation?.state === "outcome-unknown"
          ? <Alert variant="warn" role="status">Your agent couldn’t tell how this run ended. Check before running it again.</Alert>
          : opened?.raw.error && <Alert variant="destructive" role="status">{errorText(opened.raw)}</Alert>}
        {state.text === "Empty" && <p className="text-sm text-muted-foreground">No output</p>}
        {opened?.raw.output && (state.text === "Text" || state.text === "Truncated") &&
          <div className="rounded-tile bg-secondary p-4 whitespace-pre-wrap break-words">{opened.raw.output}</div>}
        {state.text === "Truncated" && <p className="text-sm text-muted-foreground">Only the start of the output is shown.</p>}
        <Approval runtime={runtime} run={state.runId} owner={owner} {...(opened ? { approvals: opened.approvals } : {})} />
        {opened && <RunActivity key={opened.raw.id} run={opened.raw} status={status} />}
        {opened && sheet.can({ type: "askAbout" }) && <Button variant="secondary" onClick={() => send({ type: "askAbout" })}><Sparkles aria-hidden />Ask Alpha</Button>}
        {canSpeak() && sheet.can({ type: "readAloud" }) && <Button variant="secondary" onClick={() => send({ type: "readAloud" })}><Volume2 aria-hidden />Read aloud</Button>}
        {sheet.can({ type: "stopSpeech" }) && <Button variant="secondary" onClick={() => send({ type: "stopSpeech" })}><VolumeX aria-hidden />Stop reading</Button>}
      </section>
    );
  }
  const description = history.workflow?.description ?? row.summary;
  const occurrences = new Map<string, number>();
  const steps = (history.workflow?.steps ?? (row.kind === "Routine" ? row.record.steps : [])).map((step) => {
    const key = JSON.stringify([step.label, step.description]);
    const occurrence = (occurrences.get(key) ?? 0) + 1;
    occurrences.set(key, occurrence);
    return { ...step, key: `${key}/${String(occurrence)}` };
  });
  return (
    <>
      {description !== "" && <p className="whitespace-pre-wrap break-words">{description}</p>}
      {steps.length > 0 && (
        <ol aria-label="Steps" className="flex flex-col gap-3">
          {steps.map((step, index) => <li key={step.key} className="flex items-start gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-sm">{index + 1}</span>
            <span className="min-w-0 break-words">
              <span>{step.label}</span>
              {step.description && <span className="block text-sm text-muted-foreground">{step.description}</span>}
            </span>
          </li>)}
        </ol>
      )}
      {row.kind === "Routine" && <Lifecycle runtime={runtime} row={row.number} owner={owner} title={row.title}
        unfinished={state.history.status !== "Loaded" || history.all.some((run) => run.status === "Running")}
        interrupted={history.all[0]?.status === "Interrupted"} />}
      {row.kind === "Routine" && <RunControls runtime={runtime} row={row.number} owner={owner} title={row.title} />}
      <section aria-label="Run history" className="flex flex-col gap-3 border-t border-border pt-3">
      {state.history.status === "Loading" && <Spinner aria-label="Reading runs" />}
      {state.history.status === "Failed" && <div className="flex flex-wrap items-center gap-2">
        <Alert variant="warn" role="status">Run history couldn’t be read.</Alert>
        {sheet.can({ type: "readHistory", removed: row.removed }) && <Button variant="secondary" onClick={() => send({ type: "readHistory", removed: row.removed })}>Retry</Button>}
      </div>}
      {state.history.status === "Loaded" && state.shown === 0 && <EmptyState title="No runs yet" />}
      <ul>
        {history.all.slice(0, state.shown).map((run) => {
          const Icon = icons[run.status];
          const version = run.raw?.versionId === history.workflow?.versionId ? 1 : 2;
          const open: Event = {
            type: "openRun", runId: run.number, status: run.status, version: 1, newest: version,
          };
          const details = run.raw !== undefined && sheet.can(open);
          const scheduledAt = run.raw?.occurrence?.scheduledAt;
          const title = scheduledAt ? `Scheduled ${shownDate(Date.parse(scheduledAt))}` : shownDate(run.startedAt) || "Run";
          const detail = run.raw?.status === "waiting-approval" ? "Waiting for you" : run.raw ? labels[run.status] : run.error ?? labels[run.status];
          return <li className="border-b border-border last:border-b-0" key={run.number}>
            <ListRow className="min-h-15 px-1" leading={<Icon />} title={title} detail={detail}
              trailing={details && <ChevronRight aria-hidden className="size-5" />}
              {...(details ? { onClick: () => send(open) } : {})} />
          </li>;
        })}
      </ul>
      {sheet.can({ type: "readMore" }) && (
        <Button variant="ghost" onClick={() => send({ type: "readMore" })}>More history</Button>
      )}
      </section>
    </>
  );
}
