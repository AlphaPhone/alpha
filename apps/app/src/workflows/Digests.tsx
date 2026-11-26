// spec/app/digests/index.md, "Story: See my digests"; spec/app/digests/schedules.md, "Story: Keep my digest schedules"
import { Effect, Exit } from "effect";
import { useState, useSyncExternalStore } from "react";
import { digestSourceState, digestStatusLabel, digestSummaryText, digestTemplateName } from "@elizaos/plugin-workflow-client";
import { Alert, Button, ConfirmDialog, EmptyState, Input, ListRow, Spinner, Switch } from "@repo/ui";
import { CalendarDays, ChevronRight, Plus, RefreshCw, Sparkles, Sun } from "lucide-react";
import { useMachine as useDigestDelivery } from "../../gen/app__digests.react.ts";
import { useMachine } from "../../gen/app__digests__schedules.react.ts";
import type { Machine } from "../../gen/app__digests__schedules.effect.vibe";
import type { Change, Event } from "../../gen/app__digests__schedules.ts";
import type { Resident, Shown } from "../runtime/area.tsx";
import { type DigestNoticeIdentity, sameDigestNoticeResult } from "../platform/hosted-digests.vibe";
import { Time } from "../runtime/time.vibe";
import { setBrowserDigestChecks } from "./browser-digests.vibe";
import { askAboutNativeDigest, digestQuestionExcerpt, enableDigestNotifications, NativeDigestPanel, setNativeDigestChecks } from "./native-digests.vibe";
import { DigestWords, newDigest, pickDigestSource } from "./digests.vibe";

interface DigestsProps extends Pick<Shown<Resident | Machine | DigestWords>, "runtime"> {
  readonly owner: number;
  readonly result: number;
  readonly notice: DigestNoticeIdentity | undefined;
  readonly onResult: (number: number) => void;
}

interface NotificationRequest {
  readonly owner: number;
  readonly lease: string;
  readonly status: "requesting" | "refused";
}

/** Scheduled digests and the exact results already kept from the owner's agent. */
export function Digests({ runtime, owner, result, notice, onResult }: DigestsProps) {
  const model = useMachine(runtime);
  const delivery = useDigestDelivery(runtime);
  const native = runtime.runSync(NativeDigestPanel);
  const panel = useSyncExternalStore(native.subscribe, native.snapshot, native.snapshot);
  const [notificationRequest, setNotificationRequest] = useState<NotificationRequest>();
  const nativeState = panel.owner === owner ? panel.delivery : undefined;
  const request = notificationRequest?.owner === owner && notificationRequest.lease === nativeState?.lease ? notificationRequest : undefined;
  const state = model.state;
  if (!state || state.owner !== owner) return <Spinner aria-label="Reading scheduled digests" />;
  const home = runtime.runSync(Effect.flatMap(DigestWords, (words) => words.view(owner)));
  const results = native.available ? nativeState?.rows ?? [] : home.results;
  if (result > 0) {
    const selected = results.find((entry) => entry.cursor === result && (notice === undefined || sameDigestNoticeResult(entry, notice)));
    if (selected === undefined) return <EmptyState title="This result isn’t available" />;
    const lease = nativeState?.lease;
    const canAsk = lease !== undefined && digestQuestionExcerpt(selected) !== undefined
      && delivery.can({ type: "askAbout", owner, result, retained: true });
    return <section aria-label="Digest result" className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{digestStatusLabel(selected.status)} · {new Date(selected.scheduledAt).toLocaleString()}</p>
      <div className="rounded-tile bg-secondary p-4 whitespace-pre-wrap break-words">{digestSummaryText(selected)}</div>
      {canAsk && <Button variant="secondary" className="self-start" onClick={() => void runtime.runPromiseExit(askAboutNativeDigest(owner, lease, selected))}>
        <Sparkles aria-hidden />Ask Alpha
      </Button>}
    </section>;
  }
  const refresh = { type: "refresh" } as const;
  const unavailable = state.schedules.status === "Failed";
  const mode = delivery.state?.owner === owner &&
    (delivery.state.checks === "ResultChecks" ||
      (delivery.state.checks === "BackgroundChecks" && nativeState?.support === "nativeScheduled")) ? delivery.state : undefined;
  const background = mode ? { type: "setBackground", on: !mode.background.on } as const : undefined;
  const android = mode?.checks === "BackgroundChecks";
  const backgroundLabel = android ? "Check for digests in the background" : "Check for digests while Alpha is visible";
  const changeBackground = (on: boolean) => {
    if (android && nativeState !== undefined) void runtime.runPromiseExit(setNativeDigestChecks(owner, on, nativeState.lease));
    else if (!android) void runtime.runPromiseExit(setBrowserDigestChecks(owner, on));
  };
  const enableNotifications = (lease: string) => {
    const attempt: NotificationRequest = { owner, lease, status: "requesting" };
    setNotificationRequest(attempt);
    void runtime.runPromiseExit(enableDigestNotifications(owner, lease)).then((answer) => {
      const requested = Exit.isSuccess(answer) && answer.value;
      setNotificationRequest((current) => current !== attempt ? current : requested ? undefined : { ...attempt, status: "refused" });
    });
  };
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
    {home.capable && mode && background && (
      <>
        <label className="flex items-center justify-between gap-3">
          {backgroundLabel}
          <Switch aria-label={backgroundLabel} checked={mode.background.on} disabled={!delivery.can(background)}
            onCheckedChange={changeBackground} />
        </label>
        {mode.background.attempt.outcome === "Refused" && <Alert role="status" variant="warn">The digest preference couldn’t be saved.</Alert>}
      </>
    )}
    {nativeState !== undefined && !nativeState.noticesAllowed && <>
      <Button variant="secondary" className="self-start" disabled={request?.status === "requesting"}
        onClick={() => enableNotifications(nativeState.lease)}>Enable digest notifications</Button>
      {request?.status === "refused" && <Alert role="status" variant="warn">Digest notifications couldn’t be enabled.</Alert>}
    </>}
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
    {model.can({ type: "checkChange" }) && <Alert role="status" variant="warn">The agent didn’t confirm the change.
      <Button size="sm" variant="secondary" onClick={() => tell({ type: "checkChange" })}>Check change</Button>
    </Alert>}
    {model.can({ type: "retry" }) && <Button variant="secondary" onClick={() => tell({ type: "retry" })}>Try again</Button>}
    {model.can({ type: "letGo" }) && <Button variant="secondary" onClick={() => tell({ type: "letGo" })}>Allow a different change</Button>}
    <ConfirmDialog open={state.review.showing}
      title={state.proposed === "Create" ? "Schedule a digest?" : `${titles[state.proposed]} “${selection?.name ?? "Digest"}”?`}
      confirmLabel={titles[state.proposed]} destructive={state.proposed === "Remove"}
      onConfirm={() => tell({ type: "confirmChange" })} onCancel={() => tell({ type: "cancelReview" })}>
      {state.proposed === "Create"
        ? `At ${time} in ${zone}, the agent reads “${chosen?.label ?? "your selected source"}” for the ${state.draft.template.toLowerCase()} digest. Android can delay it, and a run more than 30 minutes late is marked missed.`
        : undefined}
    </ConfirmDialog>
    {results.length > 0 && <ul aria-label="Digest results" className="divide-y divide-border">
      {results.map((entry) => <li key={entry.runId}>
        <ListRow leading={<Sun />} title={new Date(entry.scheduledAt).toLocaleString()} detail={digestStatusLabel(entry.status)}
          trailing={<ChevronRight aria-hidden />} onClick={() => onResult(entry.cursor)} />
      </li>)}
    </ul>}
    {home.capable && !home.partial && results.length === 0 && <EmptyState title="No digest results yet" icon={<Sun />} />}
  </section>;
}
