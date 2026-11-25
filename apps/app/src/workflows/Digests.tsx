// spec/app/digests/index.md, "Story: See my digests"; spec/app/digests/schedules.md, "Story: Keep my digest schedules"
import { Effect } from "effect";
import { digestSourceState, digestStatusLabel, digestSummaryText, digestTemplateName } from "@elizaos/plugin-workflow-client";
import { Alert, Button, ConfirmDialog, EmptyState, Input, ListRow, Spinner } from "@repo/ui";
import { CalendarDays, ChevronRight, Plus, RefreshCw, Sun } from "lucide-react";
import { useMachine } from "../../gen/app__digests__schedules.react.ts";
import type { Machine } from "../../gen/app__digests__schedules.effect.vibe";
import type { Change, Event } from "../../gen/app__digests__schedules.ts";
import type { Resident, Shown } from "../runtime/area.tsx";
import { Time } from "../runtime/time.vibe";
import { DigestWords, newDigest, pickDigestSource } from "./digests.vibe";

interface DigestsProps extends Pick<Shown<Resident | Machine | DigestWords>, "runtime"> {
  readonly owner: number;
  readonly result: number;
  readonly onResult: (number: number) => void;
}

/** Scheduled digests and the exact results already kept from the owner's agent. */
export function Digests({ runtime, owner, result, onResult }: DigestsProps) {
  const model = useMachine(runtime);
  const state = model.state;
  if (!state || state.owner !== owner) return <Spinner aria-label="Reading scheduled digests" />;
  const home = runtime.runSync(Effect.flatMap(DigestWords, (words) => words.view(owner)));
  if (result > 0) {
    const selected = home.results.find((entry) => entry.cursor === result);
    if (selected === undefined) return <EmptyState title="This result isn’t available" />;
    return <section aria-label="Digest result" className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{digestStatusLabel(selected.status)} · {new Date(selected.scheduledAt).toLocaleString()}</p>
      <div className="rounded-tile bg-secondary p-4 whitespace-pre-wrap break-words">{digestSummaryText(selected)}</div>
    </section>;
  }
  const refresh = { type: "refresh" } as const;
  const unavailable = state.schedules.status === "Failed";
  const zone = runtime.runSync(Effect.flatMap(DigestWords, (words) => words.zone(owner)));
  const now = runtime.runSync(Effect.flatMap(Time, (time) => time.latest()));
  const sources = home.sources.filter(({ record }) => digestSourceState(record, now) === "current");
  const selection = home.loops.find((item) => item.number === state.row)?.record;
  const chosen = home.sources.find((item) => item.number === state.draft.source)?.record;
  const time = `${String(state.draft.when.hour).padStart(2, "0")}:${String(state.draft.when.minute).padStart(2, "0")}`;
  const tell = (event: Event) => { if (model.can(event)) void model.send(event); };
  const review = (wanted: Change): Event => ({ type: "reviewChange", wanted });
  const titles: Record<Change, string> = { Create: "Schedule digest", Pause: "Pause", Resume: "Resume", Remove: "Remove" };
  return <section className="flex flex-col gap-4">
    {model.can(refresh) && <Button className="self-end" variant="ghost" size="icon" aria-label="Refresh digests" onClick={() => void model.send(refresh)}><RefreshCw aria-hidden /></Button>}
    {state.schedules.status === "Loading" && <Spinner aria-label="Reading scheduled digests" />}
    {unavailable && <Alert variant="warn" role="status">Scheduled digests couldn’t be read.</Alert>}
    {home.partial && <Alert variant="warn" role="status">Some digest information couldn’t be read.</Alert>}
    {state.schedules.status === "Loaded" && !home.capable && <EmptyState title="Scheduled digests aren’t available on this agent" icon={<Sun />} />}
    {home.loops.length > 0 && <ul aria-label="Digest schedules" className="divide-y divide-border">
      {home.loops.map(({ number, record: loop }) => <li key={loop.id}>
        <ListRow leading={<CalendarDays />} title={loop.name || digestTemplateName(loop.spec.template)}
          detail={`${loop.spec.localTime} · ${loop.spec.timeZone}`}
          selected={state.row === number}
          {...(model.can({ type: "focusSchedule", row: number }) ? { onClick: () => tell({ type: "focusSchedule", row: number }) } : {})}
          trailing={loop.sourceState === "expired" ? "Source expired" : loop.sourceState === "revoked" ? "Source revoked" : loop.active ? "Active" : "Paused"} />
      </li>)}
    </ul>}
    {home.sources.length > 0 && <ul aria-label="Digest sources" className="divide-y divide-border">
      {home.sources.map(({ record: source }) => <li key={source.id}>
        <ListRow leading={<CalendarDays />} title={source.label} detail={source.kind}
          trailing={source.revoked ? "Revoked" : `Expires ${new Date(source.expiresAt).toLocaleDateString()}`} />
      </li>)}
    </ul>}
    {selection && !home.partial && <div className="flex flex-wrap gap-2">
      {(["Pause", "Resume", "Remove"] as const).map((action) => model.can(review(action))
        ? <Button key={action} variant="secondary" onClick={() => tell(review(action))}>{titles[action]}</Button>
        : null)}
    </div>}
    {!home.partial && sources.length > 0 && model.can({ type: "openEditor", zone: 0 }) && (
      <Button onClick={() => void runtime.runPromiseExit(newDigest())}><Plus aria-hidden />Schedule digest</Button>
    )}
    {state.editing && <div className="flex flex-col gap-3 rounded-tile bg-secondary p-4">
      <div className="flex flex-wrap gap-2">
        {(["Morning", "Evening"] as const).filter((one) => one === "Morning" || state.evening).map((template) => (
          <Button key={template} variant={state.draft.template === template ? "primary" : "outline"} aria-pressed={state.draft.template === template}
            onClick={() => tell({ type: "pickTemplate", template })}>{template}</Button>
        ))}
      </div>
      <label className="grid gap-1 text-sm">Time in {zone}
        <Input type="time" value={time} onChange={(event) => {
          const [hour, minute] = event.currentTarget.value.split(":").map(Number);
          if (hour !== undefined && minute !== undefined) tell({ type: "setTime", hour, minute });
        }} />
      </label>
      <fieldset className="divide-y divide-border">
        <legend className="text-sm">Source</legend>
        {sources.map(({ number, record }) => (
          <ListRow key={number} title={record.label} selected={number === state.draft.source}
            onClick={() => void runtime.runPromiseExit(pickDigestSource(number))} />
        ))}
      </fieldset>
      <div className="flex gap-2">
        {model.can(review("Create")) && <Button onClick={() => tell(review("Create"))}>Review</Button>}
        <Button variant="outline" onClick={() => tell({ type: "closeEditor" })}>Cancel</Button>
      </div>
    </div>}
    {state.change.live && <Spinner aria-label="Saving the schedule" />}
    {state.change.attempt.outcome === "Refused" && <Alert role="status" variant="warn">The agent didn’t save the schedule.</Alert>}
    {model.can({ type: "checkChange" }) && <Alert role="status" variant="warn">The agent didn’t confirm the change. Refresh before trying again.</Alert>}
    <ConfirmDialog open={state.review.showing}
      title={state.proposed === "Create" ? "Schedule a digest?" : `${titles[state.proposed]} “${selection?.name ?? "Digest"}”?`}
      confirmLabel={titles[state.proposed]} destructive={state.proposed === "Remove"}
      onConfirm={() => tell({ type: "confirmChange" })} onCancel={() => tell({ type: "cancelReview" })}>
      {state.proposed === "Create"
        ? `At ${time} in ${zone}, the agent reads “${chosen?.label ?? "your selected source"}” for the ${state.draft.template.toLowerCase()} digest. Android can delay it, and a run more than 30 minutes late is marked missed.`
        : undefined}
    </ConfirmDialog>
    {home.results.length > 0 && <ul aria-label="Digest results" className="divide-y divide-border">
      {home.results.map((entry) => <li key={entry.runId}>
        <ListRow leading={<Sun />} title={new Date(entry.scheduledAt).toLocaleString()} detail={digestStatusLabel(entry.status)}
          trailing={<ChevronRight aria-hidden />} onClick={() => onResult(entry.cursor)} />
      </li>)}
    </ul>}
    {home.capable && !home.partial && home.results.length === 0 && <EmptyState title="No digest results yet" icon={<Sun />} />}
  </section>;
}
