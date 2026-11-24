// spec/calendar/deletions.md, "Story: Undo a deletion before it is sent"
import type { DeferredDeletes } from "../../../gen/calendar__deletions.ts";
import { Toast, ToastProvider, ToastViewport } from "../components/ui/index.ts";

/** The held deletions, and the owner's answers to the newest one's notice. */
export type UndoNoticesViewProps = {
  /** The agent Calendar deletions held for Undo. */
  held: DeferredDeletes;
  /** The notice of a held deletion opened or closed on screen. */
  onOffered: (id: number, open: boolean) => void;
  onUndo: (id: number) => void;
};

/**
 * The Undo notice of the newest held deletion; its window does not end while it is on screen.
 * @model spec/calendar/deletions.md
 */
export function UndoNoticesView({ held, onOffered, onUndo }: UndoNoticesViewProps) {
  const waiting = held.held.find((entry) => entry.phase === "Waiting");
  return (
    <ToastProvider duration={10_000}>
      {waiting && (
        <Toast key={waiting.id} title={waiting.decline ? "Invitation declined" : "Event deleted"}
          onOpenChange={(open) => onOffered(waiting.id, open)}
          action={{ label: "Undo", onAction: () => onUndo(waiting.id) }} />
      )}
      <ToastViewport />
    </ToastProvider>
  );
}
