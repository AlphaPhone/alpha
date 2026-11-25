// spec/app/workflows/list.md, "Story: Find a workflow"; spec/app/workflows/index.md, "Story: Open a workflow"
import { Effect } from "effect";
import { Button, EmptyState, ListRow, Screen, Spinner, Switch } from "@repo/ui";
import { Bell, CalendarSync, ChevronDown, ChevronRight, Clock as ClockIcon, Info, Plus, Repeat, RotateCw, Sun, Workflow } from "lucide-react";
import { type MouseEvent, useMemo, useRef, useState } from "react";
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
import { Rows, type WorkflowRow, refresh, shownUnder } from "./list.vibe";

const remoteConnection = "Connect your remote agent in Settings.";
const signedOutChoices = [
  { name: "Automation", Icon: Repeat },
  { name: "Reminder", Icon: Bell },
];
const addRow = "min-h-16 rounded-segment bg-secondary px-3 disabled:opacity-100 aria-disabled:opacity-100 [&>span>span:first-child]:font-semibold [&>span>span:nth-child(2)]:text-sm";

const labels = { On: "On", Off: "Off", WaitingForYou: "Waiting for you", HistoryKept: "History kept" };

function listLabel(kind: keyof typeof kinds, status: keyof typeof statuses) {
  const type = kind === "AllKinds" ? "All workflows" : kinds[kind];
  return status === "AnyStatus" ? type : `${type} · ${statuses[status]}`;
}

function WorkflowListRow({ row, open }: { row: WorkflowRow; open: () => void }) {
  const canManage = !row.removed && (row.kind === "Routine" || row.kind === "Prompt");
  return (
    <li className="flex items-center gap-3">
      <ListRow
        className="min-h-23 min-w-0 flex-1 px-1 py-3.5"
        title={row.title}
        detail={row.summary || row.removed ? <span className="block line-clamp-2 whitespace-normal break-words">
          {row.removed ? labels.HistoryKept : row.summary}
        </span> : undefined}
        trailing={<ChevronRight aria-hidden className="size-5" />}
        onClick={open}
      />
      {canManage && <Switch aria-label={`Review whether ${row.title} is on`} checked={row.on} onCheckedChange={open} />}
    </li>
  );
}

/** The owner's workflows, prompts, reminders and schedules, with the last filter choices kept while looking at a row. */
export function Workflows({ runtime, alpha }: Shown<Resident | Rows | Machine | RunSheet | HistoryWordsPort | WorkflowMachine | DefinitionWords | RunsMachine | ApprovalsMachine | ApprovalWords | BuilderMachine | GenerateMachine | DraftWords | AutomationsMachine | AutomationWords | ClockMachine | AlarmLabel | DigestMachine | DigestWords>) {
  const { state, can, send } = useMachine(runtime);
  const [clockSurface, setClockSurface] = useState<HTMLDivElement | null>(null);
  const clockOpenerRef = useRef<HTMLButtonElement>(null);
  const filterOpenerRef = useRef<HTMLButtonElement>(null);
  const editingAutomation = useAutomations(runtime).state?.editing;
  const editingWorkflow = useBuilder(runtime).state?.open;
  const clock = useClock(runtime);
  const hasClock = clockAvailable();
  const openClock = { type: "openClock", available: hasClock } as const;
  const showClock = (event: MouseEvent<HTMLButtonElement>) => {
    if (!clock.can(openClock)) return;
    clockOpenerRef.current = event.currentTarget;
    void clock.send(openClock);
  };
  const alarms = (newItem = false) => hasClock && <ListRow className="min-h-17.5 px-1"
    title={newItem ? "Alarm" : "Alarms"} leading={newItem ? <ClockIcon /> : undefined}
    aria-label="Clock alarms" aria-haspopup="dialog" trailing={<ChevronRight aria-hidden className="size-5" />}
    onClick={showClock} />;
  const read = () => void runtime.runPromiseExit(refresh());
  const snapshot = state === undefined ? undefined : shownUnder(runtime.runSync(Effect.flatMap(Rows, (rows) => rows.view(state.owner))), state.status);
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
    <Screen title={title} leading={<AppBack alpha={alpha} />} actions={<>
      {place?.tag === "ListingRows" && <Button variant="ghost" size="icon" aria-label="Add to Workflows" onClick={() => dispatch(add)}><Plus aria-hidden /></Button>}
    </>}>
      {state === undefined && <Spinner aria-label="Refreshing workflows" />}
      {state !== undefined && place?.tag === "ListingRows" && <>
        <div className="mx-2 flex min-h-12 items-center justify-between gap-3">
          <Button ref={filterOpenerRef} variant="ghost" className="h-12 min-w-0 gap-1.5 rounded-lg px-0 text-sm font-normal" aria-label="Filter workflows"
            aria-haspopup="dialog" disabled={!can(filter)} onClick={() => dispatch(filter)}>
            {listLabel(state.kind, state.status)}<ChevronDown aria-hidden className="size-4" />
          </Button>
          {(state.list.status === "Loaded" || state.owner === 0) && <span className="shrink-0 text-label text-muted-foreground">{rows.length} {rows.length === 1 ? "item" : "items"}</span>}
        </div>
        {(state.list.status === "Loading" || (state.owner > 0 && state.list.status === "Idle")) && (
          <div role="status" className="mx-2 flex items-center gap-2 px-1 text-sm text-muted-foreground">
            <Spinner size="sm" aria-hidden /><span className="sr-only">Refreshing workflows…</span>
          </div>
        )}
        {state.owner === 0 && <p role="status" className="mx-2 flex items-center gap-2 px-1 text-sm leading-[1.5] text-muted-foreground">
          <Info aria-hidden className="size-4 shrink-0" />{remoteConnection}
        </p>}
        {state.list.status === "Failed" && state.owner > 0 && (
          <div className="mx-2 flex items-center gap-2 px-1 text-sm text-muted-foreground" role="status">
            <Info aria-hidden className="size-4" /><span>Workflows couldn’t be read.</span>
            <Button variant="ghost" size="icon" aria-label="Retry workflows" onClick={read}><RotateCw aria-hidden /></Button>
          </div>
        )}
        {snapshot?.problems.map((source) => <p key={source} role="status" className="mx-2 px-1 text-sm text-muted-foreground">{source} couldn’t be read.</p>)}
        {state.list.status === "Loaded" && rows.length === 0 && (
          <p className="mx-2 flex items-center gap-2 px-1 text-sm leading-normal text-muted-foreground">
            <CalendarSync aria-hidden className="size-4.5" />
            {!state.complete ? "No workflows could be listed" : state.status === "Removed" ? "No removed workflows" : state.kind === "AllKinds" && state.status === "AnyStatus" ? "No workflows yet" : "No matches"}
          </p>
        )}
        {(rows.length > 0 || hasClock) && <ul aria-label="Workflows" className="mx-2 divide-y divide-border border-b border-border">
          {rows.map((row) => <WorkflowListRow key={row.number} row={row} open={() => dispatch({ type: "openRow", row: row.number })} />)}
          {hasClock && <li>{alarms()}</li>}
        </ul>}
        <Filters listing={state} can={can} send={dispatch} refresh={read} restoreFocus={() => filterOpenerRef.current?.focus()} />
      </>}
      {state?.owner === 0 && place?.tag === "ListingAdd" && (
        <div className="mx-2 flex flex-col gap-1.5 pt-1">
          {signedOutChoices.map(({ name, Icon }) => <ListRow key={name} className={addRow + " min-h-16.25"} title={name} detail={remoteConnection} leading={<Icon />} trailing={<ChevronRight aria-hidden className="size-4" />} asChild disabled><button type="button" disabled /></ListRow>)}
          <ListRow className={addRow} title="Scheduled digest" leading={<Sun />} trailing={<ChevronRight aria-hidden className="size-4" />} asChild disabled><button type="button" disabled /></ListRow>
          <ListRow className={addRow} title="Alarm" aria-label="Clock alarms" leading={<ClockIcon />} trailing={<ChevronRight aria-hidden className="size-4" />} disabled={!hasClock} aria-haspopup="dialog" onClick={showClock} />
          <details className="group rounded-lg">
            <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm text-muted-foreground">
              <span className="group-open:hidden">More options</span>
              <span className="hidden group-open:inline">Fewer options</span>
            </summary>
            <ListRow className={addRow} title="Steps" detail={remoteConnection} leading={<Workflow />} asChild disabled><button type="button" disabled /></ListRow>
            <ListRow className={addRow} title="Phone reminder" leading={<Bell />} trailing={<ChevronRight aria-hidden />} onClick={() => void runtime.runPromiseExit(newPhoneReminder())} />
          </details>
          <p role="status" className="mt-2.25 text-base leading-[1.5] text-foreground">{remoteConnection}</p>
        </div>
      )}
      {state !== undefined && state.owner > 0 && place?.tag === "ListingAdd" && <>
        {!editingWorkflow && <Automation runtime={runtime} owner={state.owner} />}
        {!editingAutomation && <Authoring runtime={runtime} owner={state.owner} />}
        {!editingAutomation && !editingWorkflow && <>
          <ListRow className="min-h-18 px-1" title="Phone reminder" leading={<Bell />} trailing={<ChevronRight aria-hidden className="size-5" />}
            onClick={() => void runtime.runPromiseExit(newPhoneReminder())} />
          {digestLink}
          {alarms(true)}
        </>}
      </>}
      {state && place?.tag === "ListingDigests" && <Digests runtime={runtime} owner={state.owner} result={place.result}
        notice={place.notice.runId === "" ? undefined : place.notice}
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
