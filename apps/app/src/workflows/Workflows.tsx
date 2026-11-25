// spec/app/workflows/list.md, "Story: Find a workflow"; spec/app/workflows/index.md, "Story: Open a workflow"
import { Effect } from "effect";
import { Button, EmptyState, ListRow, Screen, Spinner, Switch } from "@repo/ui";
import { Bell, Calendar, ChevronDown, ChevronRight, Clock as ClockIcon, Info, Phone, Plus, Repeat, Sparkles, Sun, Workflow } from "lucide-react";
import { useMemo, useRef, useState } from "react";
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
import { type AlarmLabel, clockAvailable } from "./clock.vibe";
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

const labels = { On: "On", Off: "Off", WaitingForYou: "Waiting for you", HistoryKept: "History kept" };

function listLabel(kind: keyof typeof kinds, status: keyof typeof statuses) {
  const type = kind === "AllKinds" ? "All workflows" : kinds[kind];
  return status === "AnyStatus" ? type : `${type} · ${statuses[status]}`;
}

/** Each kind of row's icon, as v121 drew the row (automations.css .workflow-row). */
const kindIcons = { Reminder: Bell, Prompt: Sparkles, Schedule: Calendar, Routine: Workflow } as const;

/** A row as v121 drew it: the kind's icon, the title, the summary and state in quieter type, a chevron, and the switch beside it. */
function WorkflowListRow({ row, open }: { row: WorkflowRow; open: () => void }) {
  const canManage = !row.removed && (row.kind === "Routine" || row.kind === "Prompt");
  const Kind = kindIcons[row.kind];
  return (
    <li className="flex items-center gap-3 border-b border-border">
      <button type="button" onClick={open}
        className="flex min-h-18 min-w-0 flex-1 items-center gap-3 px-1 py-4 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary">
        <Kind aria-hidden className="size-5.5 shrink-0" />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-lg leading-snug break-words">{row.title}</span>
          {row.summary !== "" && <span className="line-clamp-2 text-sm leading-normal break-words text-muted-foreground">{row.summary}</span>}
          <span className="text-xs leading-normal text-muted-foreground">{labels[badge(row.on, row.removed, false)]}</span>
        </span>
        <ChevronRight aria-hidden className="ml-auto size-5.5 shrink-0 text-muted-foreground" />
      </button>
      {canManage && <Switch aria-label={`Turn ${row.title} on or off`} checked={row.on} onCheckedChange={open} />}
    </li>
  );
}

/** The owner's workflows, prompts, reminders and schedules, with the last filter choices kept while looking at a row. */
export function Workflows({ runtime, alpha }: Shown<Resident | Rows | Machine | RunSheet | HistoryWordsPort | WorkflowMachine | DefinitionWords | RunsMachine | ApprovalsMachine | ApprovalWords | BuilderMachine | GenerateMachine | DraftWords | AutomationsMachine | AutomationWords | ClockMachine | AlarmLabel | DigestMachine | DigestWords>) {
  const { state, can, send } = useMachine(runtime);
  const [clockSurface, setClockSurface] = useState<HTMLDivElement | null>(null);
  const clockOpenerRef = useRef<HTMLButtonElement>(null);
  const editingAutomation = useAutomations(runtime).state?.editing;
  const editingWorkflow = useBuilder(runtime).state?.open;
  const clock = useClock(runtime);
  const hasClock = clockAvailable();
  const openClock = { type: "openClock", available: hasClock } as const;
  const alarms = (newItem = false) => hasClock && <ListRow className="min-h-17.5 px-1"
    title={newItem ? "Alarm" : "Alarms"} leading={newItem ? <ClockIcon /> : undefined}
    aria-label="Clock alarms" aria-haspopup="dialog" trailing={<ChevronRight aria-hidden className="size-5" />}
    onClick={(event) => {
      if (clock.can(openClock)) {
        clockOpenerRef.current = event.currentTarget;
        void clock.send(openClock);
      }
    }} />;
  const read = () => void runtime.runPromiseExit(refresh());
  const snapshot = state === undefined ? undefined : runtime.runSync(Effect.flatMap(Rows, (rows) => rows.view(state.owner)));
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
  const filter = { type: "openFilters" } as const;
  const add = { type: "openAdd" } as const;
  const screen = (
    <Screen title={title} leading={<AppBack alpha={alpha} />} actions={can(add) &&
      <Button variant="ghost" size="icon" aria-label="Add to Workflows" onClick={() => dispatch(add)}><Plus aria-hidden /></Button>}>
      {state === undefined && <Spinner aria-label="Refreshing workflows" />}
      {state !== undefined && place?.tag === "ListingRows" && <>
        <div className="flex items-center justify-between gap-3 px-1 pb-3">
          <button type="button" aria-label="Filter workflows" aria-haspopup="dialog" disabled={!can(filter)} onClick={() => dispatch(filter)}
            className="flex min-h-12 min-w-0 items-center gap-1.5 rounded-md text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <span className="min-w-0 break-words">{listLabel(state.kind, state.status)}</span><ChevronDown aria-hidden className="size-4 shrink-0" />
          </button>
          {state.list.status === "Loaded" && <span className="text-xs whitespace-nowrap text-muted-foreground">{`${rows.length} ${rows.length === 1 ? "item" : "items"}`}</span>}
        </div>
        {(state.list.status === "Loading" || (state.owner > 0 && state.list.status === "Idle")) && (
          <div role="status" className="px-1 text-sm text-muted-foreground"><Spinner size="sm" aria-hidden /><span className="sr-only">Refreshing workflows…</span></div>
        )}
        {(state.list.status === "Failed" || state.owner === 0) && (
          <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground" role="status">
            <Info aria-hidden className="size-4 shrink-0" /><span>Workflows couldn’t be read.</span>
            <Button variant="ghost" size="icon" aria-label="Retry workflows" onClick={read}><Repeat aria-hidden /></Button>
          </div>
        )}
        {snapshot?.problems.map((source) => <p key={source} role="alert" className="px-1 text-sm text-foreground">{source} couldn’t be read.</p>)}
        {state.list.status === "Loaded" && rows.length === 0 && (
          <p className="flex items-center gap-2 px-1 text-sm text-muted-foreground"><Repeat aria-hidden className="size-4.5 shrink-0" />
            <span>{!state.complete ? "No workflows could be listed" : state.status === "Removed" ? "No removed workflows" : state.kind === "AllKinds" && state.status === "AnyStatus" ? "No workflows yet" : "No matches"}</span>
          </p>
        )}
        <ul aria-label="Workflows" className="mx-1.5 flex flex-col">
          {rows.map((row) => <WorkflowListRow key={row.number} row={row} open={() => dispatch({ type: "openRow", row: row.number })} />)}
          {hasClock && <li className="border-b border-border">{alarms()}</li>}
        </ul>
        <Filters listing={state} can={can} send={dispatch} refresh={read} />
      </>}
      {state && place?.tag === "ListingAdd" && <>
        {!editingWorkflow && <Automation runtime={runtime} owner={state.owner} />}
        {!editingAutomation && <Authoring runtime={runtime} owner={state.owner} />}
        {!editingAutomation && !editingWorkflow && <>
          <ListRow className="min-h-18 px-1" title="Phone reminder" leading={<Phone />} trailing={<ChevronRight aria-hidden className="size-5" />}
            onClick={() => void runtime.runPromiseExit(newPhoneReminder())} />
          {digestLink}
          {alarms(true)}
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
    </Screen>
  );
  return (
    <div ref={setClockSurface} className="relative flex min-h-0 flex-1 flex-col">
      {screen}
      {clockSurface && clock.state?.open && <ClockPage runtime={runtime} container={clockSurface} restoreFocus={() => clockOpenerRef.current?.focus()} />}
    </div>
  );
}
