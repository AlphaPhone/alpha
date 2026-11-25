// spec/app/notices/deletions.md, "Story: Delete several things, each with its own Undo"; spec/app/notices/deletions.md, "Story: See how my deletions ended"; spec/app/notices/deletion.md, "Story: Undo a deletion"
import { Banner, Button } from "@repo/ui";
import { Effect, Layer, type ManagedRuntime } from "effect";
import { RotateCcw, X } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import { visible as deletionVisible } from "../../gen/app__notices__deletion.ts";
import type { Machine as DeletionsMachine } from "../../gen/app__notices__deletions.effect.vibe";
import { useMachine as useDeletions } from "../../gen/app__notices__deletions.react.ts";
import { canDismiss, canRefresh, canResume, canUndo, held, statusUnavailable } from "../../gen/app__notices__deletions.ts";
import type { Machine as ToastsMachine } from "../../gen/app__notices__toasts.effect.vibe";
import { type Resident, type Shown, area } from "../runtime/area.tsx";
import { useTimed } from "../runtime/react.ts";
import { Time } from "../runtime/time.vibe";
import {
  DELETION_NOTICE_TEXT,
  DeletionDesk,
  dismissDeletion,
  refreshDeletion,
  resumeDeletion,
  undoDeletion,
} from "./deletions.vibe";

export type UndoBarRuntime = ManagedRuntime.ManagedRuntime<
  DeletionsMachine | DeletionDesk | ToastsMachine | Time,
  unknown
>;

/** Notice bar displaying every active deferred deletion visible to the signed-in owner. */
export function UndoBarView({ runtime }: { runtime: UndoBarRuntime }) {
  const { state } = useTimed(runtime, useDeletions);
  const desk = useMemo(() => runtime.runSync(Effect.flatMap(DeletionDesk, (found) => Effect.succeed(found))), [runtime]);
  const snap = useSyncExternalStore((listener) => desk.subscribe(listener), () => desk.snapshot(), () => desk.snapshot());
  if (!state) return null;

  const now = runtime.runSync(Effect.flatMap(Time, (clock) => clock.now()));
  const rows = state.numbers
    .map((number) => ({ number, entry: held(state, number), detail: snap.details.get(number) }))
    .filter(({ entry }) => deletionVisible(entry, state.viewer));

  const unavailable = statusUnavailable(state);
  if (rows.length === 0 && !unavailable) return null;

  return (
    <div
      data-alpha-deletions-bar=""
      aria-label="Pending deletions"
      className="fixed inset-x-4 bottom-20 z-toast flex flex-col gap-2"
    >
      {unavailable ? <Banner variant="warn">{DELETION_NOTICE_TEXT.statusUnavailable}</Banner> : null}
      {rows.map(({ number, entry, detail }) => {
        const title = detail?.title ?? `Item #${number}`;
        const label = entry.trouble === "NotQueued"
          ? "Deletion was not queued"
          : entry.trouble === "UndoUnconfirmed"
            ? DELETION_NOTICE_TEXT.undoUnconfirmed
            : entry.trouble === "NotDismissed"
              ? DELETION_NOTICE_TEXT.dismissFailed
              : entry.paused
                ? DELETION_NOTICE_TEXT.paused
                : entry.attempt.outcome === "Sent"
                  ? DELETION_NOTICE_TEXT.verifying
                  : entry.attempt.outcome === "Unknown"
                    ? DELETION_NOTICE_TEXT.uncertain
                    : entry.attempt.outcome === "Confirmed"
                      ? `Deleted ${title}`
                      : entry.attempt.outcome === "Refused"
                        ? `${title} changed before deleting`
                        : detail?.message ?? DELETION_NOTICE_TEXT.queued;

        const showUndo = canUndo(state, number, now);
        const showResume = canResume(state, number, Math.max(1, label.length), 100);
        const showRefresh = canRefresh(state, number);
        const showDismiss = canDismiss(state, number);

        return (
          <div
            key={number}
            data-deletion-number={number}
            className="flex items-center justify-between gap-2 rounded-tile bg-secondary px-4 py-2.5 text-sm text-secondary-foreground shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {showUndo ? (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Undo ${title}`}
                  onClick={() => void runtime.runPromise(undoDeletion(number))}
                >
                  <RotateCcw className="size-3.5" />
                  Undo
                </Button>
              ) : null}
              {showResume ? (
                <Button
                  variant="secondary"
                  size="sm"
                  aria-label={`Delete ${title} again`}
                  onClick={() => void runtime.runPromise(resumeDeletion(number))}
                >
                  Delete again
                </Button>
              ) : null}
              {showRefresh ? (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Refresh ${title}`}
                  onClick={() => void runtime.runPromise(refreshDeletion(number))}
                >
                  Refresh
                </Button>
              ) : null}
              {showDismiss ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Dismiss ${title}`}
                  onClick={() => void runtime.runPromise(dismissDeletion(number))}
                >
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function UndoBarOverlay({ runtime }: Shown<Resident>) {
  return <UndoBarView runtime={runtime} />;
}

/** Deferred-deletion Undo bar, mounted at `notice` in areas.ts. */
export default area(Layer.empty, UndoBarOverlay);
