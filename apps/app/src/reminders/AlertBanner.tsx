// spec/app/reminders/alerts.md, "Story: Alert on due reminders and act from the banner"
import { Button, focusRing } from "@repo/ui";
import { Effect, type ManagedRuntime } from "effect";
import { Bell, Check, Clock, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import type * as BrowserAlerts from "../../gen/app__notices__browserAlerts.effect.vibe";
import { useMachine as useBrowserAlerts } from "../../gen/app__notices__browserAlerts.react.ts";
import type * as Alerts from "../../gen/app__reminders__alerts.effect.vibe";
import { useMachine as useAlertsMachine } from "../../gen/app__reminders__alerts.react.ts";
import { native } from "../platform/device.vibe";
import { useTimed } from "../runtime/react.ts";
import type { Time } from "../runtime/time.vibe";
import { snoozeAlertFromBanner } from "./alerts.vibe";
import { formatRelativeDue, snoozeTargetMs } from "./recurrence.ts";
import { AlertBannerShelf, RemindersNowShelf } from "./shelf.vibe";

/** Floating due-reminder notification banner with one-tap Complete, Snooze (10m / 1h / Tomorrow) and Dismiss actions. */
export function AlertBanner({
  runtime,
  onOpenItem,
}: {
  readonly runtime: ManagedRuntime.ManagedRuntime<Alerts.Machine | AlertBannerShelf | BrowserAlerts.Machine | RemindersNowShelf | Time, unknown>;
  readonly onOpenItem?: (itemId: string) => void;
}) {
  const { state, can, send } = useTimed(runtime, useAlertsMachine);
  const bannerShelf = runtime.runSync(Effect.map(AlertBannerShelf, (service) => service.shelf));
  const nowShelf = runtime.runSync(Effect.map(RemindersNowShelf, (service) => service.shelf));
  const banner = useSyncExternalStore(bannerShelf.subscribe, bannerShelf.snapshot);
  const nowMs = useSyncExternalStore(nowShelf.subscribe, nowShelf.snapshot);
  const browserAlerts = useBrowserAlerts(runtime).state;
  if (!state || state.bannerId === 0 || banner === undefined || (!native() && browserAlerts?.status === "Disabled")) return null;
  const { item, specId, revision } = banner;
  const displayNow = nowMs > 0 ? nowMs : item.updatedAtMs;
  const dueText = formatRelativeDue(item.dueDate, item.dueMinute, displayNow, false);
  const completeEvent = { type: "completeFromBanner" as const, id: specId, expectedRevision: revision };
  const dismissEvent = { type: "dismissFromBanner" as const, id: specId, expectedRevision: revision };
  const canSnooze10 = can({ type: "snoozeFromBanner", id: specId, expectedRevision: revision, until: snoozeTargetMs(displayNow, "10m"), now: displayNow });
  const canSnooze60 = can({ type: "snoozeFromBanner", id: specId, expectedRevision: revision, until: snoozeTargetMs(displayNow, "1h"), now: displayNow });
  const canSnoozeTomorrow = can({ type: "snoozeFromBanner", id: specId, expectedRevision: revision, until: snoozeTargetMs(displayNow, "tomorrow"), now: displayNow });

  return (
    <div
      role="alertdialog"
      aria-label={`Due reminder: ${item.title}`}
      className="fixed inset-x-4 top-[calc(var(--alpha-safe-top)+--spacing(3))] z-alert mx-auto flex max-w-md flex-col gap-3 rounded-tile border border-border bg-card p-4 text-card-foreground shadow-sheet"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Bell aria-hidden className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium tracking-caps text-muted-foreground uppercase">Reminder due</p>
          <button
            type="button"
            className={`${focusRing} mt-0.5 block min-h-11 w-full truncate rounded-md text-left text-base font-semibold text-foreground`}
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
          className="min-h-11"
          disabled={!can(completeEvent)}
          onClick={() => void send(completeEvent)}
        >
          <Check aria-hidden className="size-4.5" />
          Complete
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="min-h-11"
          disabled={!canSnooze10}
          onClick={() => void runtime.runPromise(snoozeAlertFromBanner(specId, revision, "10m"))}
        >
          <Clock aria-hidden className="size-3.5" />
          10m
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="min-h-11"
          disabled={!canSnooze60}
          onClick={() => void runtime.runPromise(snoozeAlertFromBanner(specId, revision, "1h"))}
        >
          1h
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="min-h-11"
          disabled={!canSnoozeTomorrow}
          onClick={() => void runtime.runPromise(snoozeAlertFromBanner(specId, revision, "tomorrow"))}
        >
          Tomorrow
        </Button>
      </div>
    </div>
  );
}
