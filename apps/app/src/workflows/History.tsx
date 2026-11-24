// spec/app/workflows/sheet.md, "Story: See a workflow's history"; spec/app/workflows/sheet.md, "Story: Read a run's sheet"
import { Alert, Button, EmptyState, ListRow, Spinner } from "@repo/ui";
import { Check, ChevronRight, CircleAlert, Clock, Minus, Play, Square, Volume2, VolumeX, X } from "lucide-react";
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

interface HistoryProps extends Pick<Shown<Resident | HistoryWordsPort | Machine | WorkflowMachine | DefinitionWords | RunsMachine | ApprovalsMachine | ApprovalWords>, "runtime"> {
  readonly row: WorkflowRow;
  readonly owner: number;
}

/** The run history and the sheet of an exact run, as the agent last read them. */
export function History({ runtime, row, owner }: HistoryProps) {
  const sheet = useMachine(runtime);
  const state = sheet.state;
  if (state === undefined || state.owner !== owner) return <Spinner aria-label="Reading runs" />;
  const history = runtime.runSync(HistoryWordsPort.use((words) => words.view(owner, row.number)));
  const opened = history.opened?.number === state.runId ? history.opened : undefined;
  const send = (event: Event) => { if (sheet.can(event)) void sheet.send(event); };
  if (state.runId > 0) {
    const status = opened?.raw.status === "waiting-approval" ? "Waiting for you" : labels[state.status];
    const Icon = icons[state.status];
    return (
      <section aria-label="Run details" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2"><Icon aria-hidden className="size-5" /><strong>{status}</strong>
          {opened && <time dateTime={opened.raw.startedAt} className="text-sm text-muted-foreground">{shownDate(Date.parse(opened.raw.startedAt))}</time>}
        </div>
        {newerVersion(state) && <Alert role="status">This workflow has changed since this run.</Alert>}
        {state.output.status === "Loading" && <Spinner aria-label="Reading the run" />}
        {state.output.status === "Failed" && <Alert variant="warn" role="status">The run could not be read.</Alert>}
        {opened?.raw.error && <Alert variant="destructive" role="status">{opened.raw.error}</Alert>}
        {opened?.raw.reconciliation?.state === "outcome-unknown" && <Alert variant="warn" role="status">{opened.raw.reconciliation.message}</Alert>}
        {state.text === "Empty" && <p className="text-sm text-muted-foreground">No output</p>}
        {opened?.raw.output && (state.text === "Text" || state.text === "Truncated") &&
          <div className="rounded-tile bg-secondary p-4 whitespace-pre-wrap break-words">{opened.raw.output}</div>}
        {state.text === "Truncated" && <p className="text-sm text-muted-foreground">Only the start of the output is shown.</p>}
        <Approval runtime={runtime} run={state.runId} owner={owner} />
        {canSpeak() && sheet.can({ type: "readAloud" }) && <Button variant="secondary" onClick={() => send({ type: "readAloud" })}><Volume2 aria-hidden />Read aloud</Button>}
        {sheet.can({ type: "stopSpeech" }) && <Button variant="secondary" onClick={() => send({ type: "stopSpeech" })}><VolumeX aria-hidden />Stop reading</Button>}
      </section>
    );
  }
  const description = history.workflow?.description ?? row.summary;
  const steps = history.workflow?.steps ?? (row.kind === "Routine" ? row.record.steps : []);
  return (
    <>
      {description !== "" && <p className="whitespace-pre-wrap break-words">{description}</p>}
      {steps.length > 0 && (
        <ol aria-label="Steps" className="flex flex-col gap-3">
          {steps.map((step, index) => <li key={`${index}/${step.label}`} className="flex items-start gap-3">
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
          return <li className="border-b border-border last:border-b-0" key={run.number}>
            <ListRow className="min-h-15 px-1" leading={<Icon />} title={shownDate(run.startedAt) || "Run"}
              detail={run.raw?.status === "waiting-approval" ? "Waiting for you" : run.error ?? labels[run.status]}
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
