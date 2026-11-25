// spec/app/workflows/list.md, "Story: Find a workflow"; spec/app/workflows/index.md, "Story: Open a workflow"
import { Button, EmptyState, ListRow, Screen, Spinner } from "@repo/ui";
import { Bell, ChevronDown, ChevronRight, Clock, Info, Plus, RotateCw, Sparkles, Sun, Workflow } from "lucide-react";
import { useMemo } from "react";
import { useMachine } from "../../gen/app__workflows__list.react.ts";
import { type Event, badge, passes } from "../../gen/app__workflows__list.ts";
import type { Machine } from "../../gen/app__workflows__list.effect.vibe";
import type { Machine as RunSheet } from "../../gen/app__workflows__sheet.effect.vibe";
import type { Machine as WorkflowMachine } from "../../gen/app__workflows.effect.vibe";
import type { Machine as RunsMachine } from "../../gen/app__workflows__runs.effect.vibe";
import type { Machine as ApprovalsMachine } from "../../gen/app__workflows__approvals.effect.vibe";
import type { Machine as BuilderMachine } from "../../gen/app__workflows__builder.effect.vibe";
import type { Machine as GenerateMachine } from "../../gen/app__workflows__generate.effect.vibe";
import { Authoring } from "./Authoring.tsx";
import type { DraftWords } from "./authoring.vibe";
import type { Machine as AutomationsMachine } from "../../gen/app__workflows__automations.effect.vibe";
import { useMachine as useAutomations } from "../../gen/app__workflows__automations.react.ts";
import { Automation } from "./Automation.tsx";
import type { AutomationWords } from "./automations.vibe";
import type { Machine as ClockMachine } from "../../gen/app__workflows__clock.effect.vibe";
import { useMachine as useClock } from "../../gen/app__workflows__clock.react.ts";
import { useMachine as useBuilder } from "../../gen/app__workflows__builder.react.ts";
import { AlarmLabel, clockAvailable } from "./clock.vibe";
import { ClockPage } from "./Clock.tsx";
import { newPhoneReminder } from "./handoffs.vibe";
import type { Machine as DigestMachine } from "../../gen/app__digests__schedules.effect.vibe";
import { Digests } from "./Digests.tsx";
import type { DigestWords } from "./digests.vibe";
import type { ApprovalWords } from "./approvals.vibe";
import type { Resident, Shown } from "../runtime/area.tsx";
import { AppBack } from "../shell/AppBack.tsx";
import { Filters, kinds, statuses } from "./Filters.tsx";
import { History } from "./History.tsx";
import type { HistoryWordsPort } from "./history.vibe";
import type { DefinitionWords } from "./lifecycle.vibe";
import { Rows, type WorkflowRow, refresh } from "./list.vibe";

const icons = { Reminder: Bell, Prompt: Sparkles, Routine: Workflow, Schedule: Clock };
const labels = { On: "On", Off: "Off", WaitingForYou: "Waiting for you", HistoryKept: "History kept" };

function listLabel(kind: keyof typeof kinds, status: keyof typeof statuses) {
  const type = kind === "AllKinds" ? "All workflows" : kinds[kind];
  return status === "AnyStatus" ? type : `${type} · ${statuses[status]}`;
}

function WorkflowListRow({ row, event, open }: { row: WorkflowRow; event: Event; open: (event: Event) => void }) {
  const Icon = icons[row.kind];
  return (
    <li className="border-b border-border">
      <ListRow
        className="min-h-18 px-1 py-4"
        title={<span className="font-normal">{row.title}</span>}
        detail={<span className="flex flex-col gap-1">
          {row.summary !== "" && <span className="line-clamp-2 whitespace-normal break-words">{row.summary}</span>}
          <span className="text-xs">{labels[badge(row.on, row.removed, false)]}</span>
        </span>}
        leading={<Icon />}
        trailing={<ChevronRight aria-hidden className="size-5" />}
        onClick={() => open(event)}
      />
    </li>
  );
}

/** The owner's workflows, prompts, reminders and schedules, with the last filter choices kept while looking at a row. */
export function Workflows({ runtime, alpha }: Shown<Resident | Rows | Machine | RunSheet | HistoryWordsPort | WorkflowMachine | DefinitionWords | RunsMachine | ApprovalsMachine | ApprovalWords | BuilderMachine | GenerateMachine | DraftWords | AutomationsMachine | AutomationWords | ClockMachine | AlarmLabel | DigestMachine | DigestWords>) {
  const { state, can, send } = useMachine(runtime);
  const editingAutomation = useAutomations(runtime).state?.editing;
  const editingWorkflow = useBuilder(runtime).state?.open;
  const clock = useClock(runtime);
  const hasClock = clockAvailable();
  const openClock = { type: "openClock", available: hasClock } as const;
  const alarms = hasClock && clock.can(openClock)
    ? <ListRow className="min-h-18 px-1" title="Alarms" leading={<Clock />} trailing={<ChevronRight aria-hidden className="size-5" />} onClick={() => void clock.send(openClock)} />
    : null;
  const read = () => void runtime.runPromiseExit(refresh());
  const snapshot = state === undefined ? undefined : runtime.runSync(Rows.use((rows) => rows.view(state.owner)));
  const kind = state?.kind;
  const status = state?.status;
  const rows = useMemo(
    () => kind !== undefined && status !== undefined && snapshot !== undefined
      ? snapshot.rows.filter((row) => passes(row.kind, row.on, row.removed, kind, status))
      : [],
    [snapshot, kind, status],
  );
  const dispatch = (event: Event) => { if (can(event)) void send(event); };
  const place = state?.place;
  const selected = place?.tag === "ListingDetail" ? snapshot?.rows.find((row) => row.number === place.row) : undefined;
  const title = selected?.title ?? (place?.tag === "ListingAdd" ? "Add to Workflows" : place?.tag === "ListingDigests"
    ? place.result === 0 ? "Scheduled digests" : "Digest" : "Workflows");
  const openDigests: Event = { type: "openDigests" };
  const digestLink = can(openDigests)
    ? <ListRow className="min-h-18 px-1" title="Scheduled digests" leading={<Sun />} trailing={<ChevronRight aria-hidden className="size-5" />} onClick={() => dispatch(openDigests)} />
    : null;
  return (
    <Screen title={clock.state?.open ? "Alarms" : title} leading={<AppBack alpha={alpha} />} actions={!clock.state?.open && can({ type: "openAdd" }) && (
      <Button variant="ghost" size="icon" aria-label="Add to Workflows" onClick={() => dispatch({ type: "openAdd" })}><Plus aria-hidden /></Button>
    )}>
      {clock.state?.open ? <ClockPage runtime={runtime} /> : <>
      {state === undefined && <Spinner aria-label="Refreshing workflows" />}
      {state !== undefined && place?.tag === "ListingRows" && <>
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" className="-ml-2 px-2 text-sm font-normal" aria-label="Filter workflows" aria-haspopup="dialog"
            disabled={!can({ type: "openFilters" })} onClick={() => dispatch({ type: "openFilters" })}>
            {listLabel(state.kind, state.status)}<ChevronDown aria-hidden className="size-4" />
          </Button>
          <span className="text-xs whitespace-nowrap text-muted-foreground">{rows.length} {rows.length === 1 ? "item" : "items"}</span>
        </div>
        {(state.list.status === "Loading" || (state.owner > 0 && state.list.status === "Idle")) && (
          <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size="sm" aria-hidden />Refreshing workflows…</div>
        )}
        {(state.list.status === "Failed" || state.owner === 0) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Info aria-hidden className="size-4" /><span>Workflows couldn’t be read.</span>
            <Button variant="ghost" size="icon" aria-label="Retry workflows" onClick={read}><RotateCw aria-hidden /></Button>
          </div>
        )}
        {snapshot?.problems.map((source) => <p key={source} role="status" className="text-sm text-muted-foreground">{source} couldn’t be read.</p>)}
        {state.list.status === "Loaded" && rows.length === 0 && (
          <EmptyState title={state.complete ? "No workflows here" : "No workflows could be listed"} icon={<Workflow />} />
        )}
        <ul aria-label="Workflows" className="-mt-2">
          {rows.map((row) => <WorkflowListRow key={row.number} row={row} event={{ type: "openRow", row: row.number }} open={dispatch} />)}
        </ul>
        {alarms}
        {digestLink}
        <Filters listing={state} can={can} send={dispatch} refresh={read} />
      </>}
      {state && place?.tag === "ListingAdd" && <>
        {!editingWorkflow && <Automation runtime={runtime} owner={state.owner} />}
        {!editingAutomation && <Authoring runtime={runtime} owner={state.owner} />}
        {!editingAutomation && !editingWorkflow && <>
          <ListRow className="min-h-18 px-1" title="Phone reminder" leading={<Bell />} trailing={<ChevronRight aria-hidden className="size-5" />}
            onClick={() => void runtime.runPromiseExit(newPhoneReminder())} />
          {digestLink}
          {alarms}
        </>}
      </>}
      {state && place?.tag === "ListingDigests" && <Digests runtime={runtime} owner={state.owner} result={place.result}
        onResult={(result) => dispatch({ type: "openDigestResult", result })} />}
      {place?.tag === "ListingDetail" && (selected === undefined || state === undefined
        ? <EmptyState title="This item is no longer listed" />
        : selected.kind === "Routine" || selected.kind === "Prompt"
          ? <>
            {selected.kind === "Prompt" && <Automation runtime={runtime} row={selected} owner={state.owner} />}
            <History runtime={runtime} row={selected} owner={state.owner} />
          </>
          : <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">{labels[badge(selected.on, selected.removed, false)]}</p>
            {selected.summary !== "" && <p className="whitespace-pre-wrap break-words">{selected.summary}</p>}
            <Automation runtime={runtime} row={selected} owner={state.owner} />
          </div>)}
      </>}
    </Screen>
  );
}
