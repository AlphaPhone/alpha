// spec/app/notices/collection.md, "Story: Let Alpha see my notifications"; spec/app/notices/collection.md, "Story: Act on another app's notification"; spec/app/notices/collection.md, "Story: See and dismiss Alpha's own notices"; spec/app/notices/index.md, "Story: Ask Alpha about a notice"
import { Banner, Button, Card, ConfirmDialog, EmptyState, ListGroup, ListRow, Sheet, SheetContent, Switch } from "@repo/ui";
import { Effect, Layer, type ManagedRuntime } from "effect";
import { Bell, MessageSquare, Trash2, X } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import type { Machine as NoticesMachine } from "../../gen/app__notices.effect.vibe";
import { useMachine as useNotices } from "../../gen/app__notices.react.ts";
import type { Machine as CollectionMachine } from "../../gen/app__notices__collection.effect.vibe";
import { useMachine as useCollection } from "../../gen/app__notices__collection.react.ts";
import { active } from "../../gen/app__notices__collection.ts";
import type { Machine as PostingMachine } from "../../gen/app__notices__posting.effect.vibe";
import * as Layers from "../../gen/app__shell__layers.effect.vibe";
import { useMachine as useLayers } from "../../gen/app__shell__layers.react.ts";
import { top } from "../../gen/app__shell__layers.ts";
import { type Resident, type Shown, area } from "../runtime/area.tsx";
import { useTimed } from "../runtime/react.ts";
import { contained } from "../runtime/reactor.vibe";
import type { Time } from "../runtime/time.vibe";
import {
  ShadeShelf,
  askAboutShadeRow,
  clearAllShadeRows,
  clearShadeHistory,
  dismissOwnRow,
  dismissShadeRow,
  openListenerSettings,
  openShadeRow,
  pauseCollection,
  setCollectionConsent,
} from "./collection.vibe";
import { NoticeDesk, closeNoticeQuestion, confirmNoticeQuestion } from "./notices.vibe";

/** Shell layer id for the notification shade overlay. */
export const shadeLayerId = "notice-shade";

/** Open the notification shade overlay in the shell layer stack. */
export const openShade = Effect.flatMap(Layers.Machine, (layers) =>
  contained(layers.send({ type: "openLayer", id: shadeLayerId, kind: "SheetLayer", covers: true }), "opening notification shade"),
);

/** Close the notification shade overlay from the shell layer stack. */
export const closeShade = Effect.flatMap(Layers.Machine, (layers) =>
  contained(layers.send({ type: "closeLayer", id: shadeLayerId }), "closing notification shade"),
);

export type ShadeRuntime = ManagedRuntime.ManagedRuntime<
  CollectionMachine | ShadeShelf | NoticesMachine | NoticeDesk | PostingMachine | Layers.Machine | Time,
  unknown
>;

/** Notification shade overlay and "Ask Alpha about this notice" review dialog. */
export function ShadeView({ runtime, open: forceOpen }: { runtime: ShadeRuntime; open?: boolean }) {
  const layers = useLayers(runtime).state;
  const col = useTimed(runtime, useCollection);
  const taps = useTimed(runtime, useNotices);
  const shelf = useMemo(() => runtime.runSync(Effect.flatMap(ShadeShelf, (found) => Effect.succeed(found))), [runtime]);
  const desk = useMemo(() => runtime.runSync(Effect.flatMap(NoticeDesk, (found) => Effect.succeed(found))), [runtime]);
  const shadeSnap = useSyncExternalStore((listener) => shelf.subscribe(listener), () => shelf.snapshot(), () => shelf.snapshot());
  const tapSnap = useSyncExternalStore((listener) => desk.subscribe(listener), () => desk.snapshot(), () => desk.snapshot());

  const isOpen = forceOpen ?? (layers !== undefined && top(layers).id === shadeLayerId);
  const colState = col.state;
  const tapState = taps.state;
  const showingQuestion = tapState !== undefined && tapState.review.showing && tapSnap.currentExcerpt !== undefined;

  const questionDialog = showingQuestion && tapSnap.currentExcerpt ? (
    <ConfirmDialog
      open
      title="Ask Alpha about this notice"
      confirmLabel="Ask Alpha"
      onConfirm={() => void runtime.runPromise(confirmNoticeQuestion("Owner"))}
      onCancel={() => void runtime.runPromise(closeNoticeQuestion("Owner"))}
    >
      <div className="flex flex-col gap-1 text-sm" data-alpha-notice-excerpt="">
        <p className="font-semibold">{tapSnap.currentExcerpt.appLabel}</p>
        <p>{tapSnap.currentExcerpt.title}</p>
        {tapSnap.currentExcerpt.text ? <p className="text-muted-foreground">{tapSnap.currentExcerpt.text}</p> : null}
      </div>
    </ConfirmDialog>
  ) : null;

  if (!isOpen || !colState) return questionDialog;

  const isActive = active(colState);
  const owner = colState.owner;
  const canConsentOn = owner > 0;
  const canToggleExtras = owner > 0 && colState.on;

  return (
    <>
      {questionDialog}
      <Sheet open onOpenChange={(next) => { if (!next) void runtime.runPromise(closeShade); }}>
        <SheetContent
          title="Notifications"
          description={colState.locked ? "Phone locked" : isActive ? "Showing active notifications" : "Collection is off"}
          data-alpha-notice-shade=""
        >
          <div className="flex flex-col gap-4 py-2">
            {colState.locked ? (
              <Banner variant="info">Unlock your phone to view or act on notifications.</Banner>
            ) : null}

            <Card>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Collect notifications</span>
                  <Switch
                    aria-label="Collect notifications"
                    checked={colState.on}
                    disabled={!canConsentOn}
                    onCheckedChange={(checked) => {
                      void runtime.runPromise(setCollectionConsent(checked, checked && colState.preview, checked && colState.keep, owner, "Owner"));
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Show notification previews</span>
                  <Switch
                    aria-label="Show notification previews"
                    checked={colState.preview}
                    disabled={!canToggleExtras}
                    onCheckedChange={(checked) => {
                      void runtime.runPromise(setCollectionConsent(colState.on, checked, colState.keep, owner, "Owner"));
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Keep recent history</span>
                  <Switch
                    aria-label="Keep recent history"
                    checked={colState.keep}
                    disabled={!canToggleExtras}
                    onCheckedChange={(checked) => {
                      void runtime.runPromise(setCollectionConsent(colState.on, colState.preview, checked, owner, "Owner"));
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {colState.on ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void runtime.runPromise(pauseCollection(!colState.paused, "Owner"))}
                    >
                      {colState.paused ? "Resume collection" : "Pause collection"}
                    </Button>
                  ) : null}
                  {colState.access.grant !== "Granted" ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void runtime.runPromise(openListenerSettings("Owner"))}
                    >
                      Notification access
                    </Button>
                  ) : null}
                </div>
            </Card>

            {colState.own > 0 && !colState.locked ? (
              <ListGroup heading="Alpha">
                {shadeSnap.ownRows.map((row) => (
                  <ListRow
                    key={`own-${row.id}`}
                    title={row.title}
                    detail={row.text}
                    trailing={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Dismiss ${row.title}`}
                        onClick={() => void runtime.runPromise(dismissOwnRow(row.id, "Owner"))}
                      >
                        <X className="size-4" />
                      </Button>
                    }
                  />
                ))}
              </ListGroup>
            ) : null}

            {colState.rows > 0 && !colState.locked ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-muted-foreground">Other apps</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void runtime.runPromise(clearAllShadeRows("Owner"))}
                  >
                    Clear all
                  </Button>
                </div>
                <ListGroup>
                  {shadeSnap.rows.map((row) => (
                    <ListRow
                      key={row.id}
                      title={`${row.appLabel}: ${row.title}`}
                      detail={colState.previews && !row.secret ? row.text : undefined}
                      trailing={
                        <div className="flex items-center gap-1">
                          {row.owned && !row.secret ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Open ${row.title}`}
                              onClick={() => void runtime.runPromise(openShadeRow(row, "Owner"))}
                            >
                              Open
                            </Button>
                          ) : null}
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Ask Alpha about ${row.title}`}
                            onClick={() => void runtime.runPromise(askAboutShadeRow(row, owner))}
                          >
                            <MessageSquare className="size-4" />
                          </Button>
                          {row.clearable ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Dismiss ${row.title}`}
                              onClick={() => void runtime.runPromise(dismissShadeRow(row, "Owner"))}
                            >
                              <X className="size-4" />
                            </Button>
                          ) : null}
                        </div>
                      }
                    />
                  ))}
                </ListGroup>
              </div>
            ) : !colState.locked && colState.own === 0 ? (
              <EmptyState icon={<Bell className="size-6" />} title="No notifications" />
            ) : null}

            {colState.kept > 0 ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-muted-foreground">History ({colState.kept})</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void runtime.runPromise(clearShadeHistory("Owner"))}
                  >
                    <Trash2 className="size-3.5" />
                    Clear history
                  </Button>
                </div>
                <ListGroup>
                  {shadeSnap.history.map((item) => (
                    <ListRow key={`hist-${item.id}-${item.at}`} title={item.title} detail={item.appLabel} />
                  ))}
                </ListGroup>
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function ShadeOverlay({ runtime }: Shown<Resident>) {
  return <ShadeView runtime={runtime} />;
}

/** Notification shade overlay, mounted at `overlay` in areas.ts. */
export default area(Layer.empty, ShadeOverlay);
