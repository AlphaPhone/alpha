// spec/app/workflows/list.md, "Story: Find a workflow"; spec/app/workflows/index.md, "Story: Open a workflow"
import { Button, EmptyState, ListRow, Screen, Spinner } from "@repo/ui";
import { Bell, ChevronDown, ChevronRight, Clock, Info, RotateCw, Sparkles, Workflow } from "lucide-react";
import { useMemo } from "react";
import { useMachine } from "../../gen/app__workflows__list.react.ts";
import { type Event, badge, passes } from "../../gen/app__workflows__list.ts";
import type { Machine } from "../../gen/app__workflows__list.effect.vibe";
import type { Resident, Shown } from "../runtime/area.tsx";
import { AppBack } from "../shell/AppBack.tsx";
import { Filters, kinds, statuses } from "./Filters.tsx";
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
export function Workflows({ runtime, alpha }: Shown<Resident | Rows | Machine>) {
  const { state, can, send } = useMachine(runtime);
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
  const title = selected?.title ?? (place?.tag === "ListingAdd" ? "Add to Workflows" : "Workflows");
  return (
    <Screen title={title} leading={<AppBack alpha={alpha} />}>
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
        <Filters listing={state} can={can} send={dispatch} refresh={read} />
      </>}
      {place?.tag === "ListingDetail" && (selected === undefined
        ? <EmptyState title="This item is no longer listed" />
        : <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{labels[badge(selected.on, selected.removed, false)]}</p>
          {selected.summary !== "" && <p className="whitespace-pre-wrap break-words">{selected.summary}</p>}
          {selected.kind === "Routine" && selected.record.steps.length > 0 && (
            <ol aria-label="Steps" className="flex flex-col gap-3">
              {selected.record.steps.map((step, index) => <li key={index} className="flex items-start gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-sm">{index + 1}</span>
                <span className="min-w-0 break-words">{step.label}</span>
              </li>)}
            </ol>
          )}
        </div>)}
    </Screen>
  );
}
