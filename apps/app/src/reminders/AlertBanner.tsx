// spec/app/reminders/alerts.md, "Story: Alert on due reminders and act from the banner"
import { Button } from "@repo/ui";
import type { ManagedRuntime } from "effect";
import { BellRing, Check, Clock, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import type * as Alerts from "../../gen/app__reminders__alerts.effect.vibe";
import { useMachine as useAlertsMachine } from "../../gen/app__reminders__alerts.react.ts";
import { useTimed } from "../runtime/react.ts";
import { untimed } from "../runtime/reactor.vibe";
import { Time } from "../runtime/time.vibe";
import { alertBannerStore } from "./alerts.vibe";
import { formatRelativeDue, snoozeTargetMs } from "./recurrence.ts";

/** Floating due-reminder notification banner with one-tap Complete, Snooze (10m / 1h / Tomorrow) and Dismiss actions. */
export function AlertBanner({
  runtime,
  onOpenItem,
}: {
  readonly runtime: ManagedRuntime.ManagedRuntime<Alerts.Machine | Time, unknown>;
  readonly onOpenItem?: (itemId: string) => void;
}) {
  const { state, can, send } = useTimed(runtime, useAlertsMachine);
  const banner = useSyncExternalStore((listener) => alertBannerStore.subscribe(listener), alertBannerStore.snapshot);
  const nowMs = runtime.runSync(Time.use((time) => time.latest()));
  if (!state || state.bannerId === 0 || banner === undefined) return null;
  const { item, specId, revision } = banner;
  const dueText = formatRelativeDue(item.dueDate, item.dueMinute, nowMs, false);
  const snooze10 = snoozeTargetMs(nowMs, "10m");
  const snooze60 = snoozeTargetMs(nowMs, "1h");
  const snoozeTomorrow = snoozeTargetMs(nowMs, "tomorrow");
  const completeEvent = { type: "completeFromBanner" as const, id: specId, expectedRevision: revision };
  const dismissEvent = { type: "dismissFromBanner" as const, id: specId, expectedRevision: revision };

  return (
    <div
      role="alertdialog"
      aria-label={`Due reminder: ${item.title}`}
      className="fixed inset-x-4 top-[max(--spacing(3),env(safe-area-inset-top))] z-toast mx-auto flex max-w-md flex-col gap-3 rounded-tile border border-border bg-card p-4 text-card-foreground shadow-sheet"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <BellRing aria-hidden className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium tracking-caps text-muted-foreground uppercase">Reminder due</p>
          <button
            type="button"
            className="mt-0.5 block w-full truncate text-left text-base font-semibold text-foreground"
            onClick={() => onOpenItem?.(item.id)}
          >
            {item.title}
          </button>
          {dueText ? <p className="mt-0.5 text-sm text-muted-foreground">{dueText}</p> : null}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Dismiss reminder alert"
          disabled={!can(dismissEvent)}
          onClick={() => void send(dismissEvent)}
        >
          <X />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!can(completeEvent)}
          onClick={() => void send(completeEvent)}
        >
          <Check aria-hidden className="size-4" />
          Complete
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!can({ type: "snoozeFromBanner", id: specId, expectedRevision: revision, until: snooze10, now: untimed })}
          onClick={() => void send({ type: "snoozeFromBanner", id: specId, expectedRevision: revision, until: snooze10, now: untimed })}
        >
          <Clock aria-hidden className="size-3.5" />
          10m
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!can({ type: "snoozeFromBanner", id: specId, expectedRevision: revision, until: snooze60, now: untimed })}
          onClick={() => void send({ type: "snoozeFromBanner", id: specId, expectedRevision: revision, until: snooze60, now: untimed })}
        >
          1h
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!can({ type: "snoozeFromBanner", id: specId, expectedRevision: revision, until: snoozeTomorrow, now: untimed })}
          onClick={() => void send({ type: "snoozeFromBanner", id: specId, expectedRevision: revision, until: snoozeTomorrow, now: untimed })}
        >
          Tomorrow
        </Button>
      </div>
    </div>
  );
}
