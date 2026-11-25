import { Button } from "../Button.tsx";
import { Dialog, DialogContent, DialogTitle } from "../Dialog.tsx";
import { StartupAccessRow, type StartupAccessRowProps } from "./StartupAccessRow.tsx";
import type { StartupAccess, StartupAccessNotice } from "./vocabulary.ts";

export type StartupAccessRowState = Pick<StartupAccessRowProps, "access" | "word" | "action" | "busy">;

export type StartupAccessPanelProps = {
  /** Every access this walkthrough offers, in order. */
  rows: StartupAccessRowState[];
  /** The step being asked, or the one access under review; a review of all has none. */
  current?: StartupAccess;
  /** A review from Settings: its rows are looked at, not walked, and it ends with Done. */
  review?: boolean;
  /** How far the walkthrough is: the step being asked, of how many. Left out in a review. */
  place?: { step: number; count: number };
  /** What the last press or answer said. */
  notice?: StartupAccessNotice;
  /** Presses the action of a row; given exactly when the machine allows it. */
  onAct?: (access: StartupAccess) => void;
  /** Passes a step that is ready, or says to allow it first; refused while Android is answering. */
  onContinue?: () => void;
  /** Passes a step without allowing it; offered once its state is known or it has stalled. */
  onSkip?: () => void;
  /** Leaves a review. */
  onDone?: () => void;
};

const notices: Record<StartupAccessNotice, string> = {
  AllowFirst: "Allow first",
  StillOff: "Still off",
  NotConfirmed: "Couldn't confirm",
  NotSaved: "Not saved",
};

export const startupPanel = "inset-0 grid max-w-none translate-y-0 overflow-y-auto overscroll-contain rounded-none bg-background px-6 pt-[max(--spacing(8),env(safe-area-inset-top))] pb-[max(--spacing(8),env(safe-area-inset-bottom))] text-foreground shadow-none motion-safe:animate-none";
export const startupMainAction = "h-13 w-full rounded-lg bg-alpha font-medium text-alpha-foreground hover:bg-alpha/90 active:bg-alpha/80";

/**
 * The walkthrough that asks for each access in order, or a review of them from Settings: one list, the step being
 * asked carrying its action, Continue and Skip, or Done. It stands over Home, which is held still beneath it.
 * @model spec/app/startup/access.md
 */
export function StartupAccessPanel({ rows, current, review = false, place, notice, onAct, onContinue, onSkip, onDone }: StartupAccessPanelProps) {
  const said = notice ? notices[notice] : undefined;
  return (
    <Dialog open>
      <DialogContent
        className={startupPanel}
        aria-describedby={undefined}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          if (review) onDone?.();
        }}
      >
        <div className="m-auto flex w-full max-w-90 flex-col">
          <DialogTitle className="mb-5 text-center font-display text-4xl font-light text-balance">Access</DialogTitle>
          {place ? <p role="status" className="mb-2 text-center text-sm text-muted-foreground">Step {place.step} of {place.count}</p> : null}
          <ol>
            {rows.map((row) => (
              <StartupAccessRow key={row.access} {...row} current={row.access === current} onAct={onAct && row.action ? () => onAct(row.access) : undefined} />
            ))}
          </ol>
          {said ? <p role={notice === "NotSaved" ? "alert" : "status"} className="mt-5 text-center text-sm">{said}</p> : null}
          <div className="mt-9 flex min-h-27 flex-col items-center gap-2">
            {review ? (
              <Button className={startupMainAction} disabled={!onDone} onClick={onDone}>Done</Button>
            ) : (
              <>
                <Button className={startupMainAction} disabled={!onContinue} onClick={onContinue}>Continue</Button>
                {onSkip ? <Button variant="ghost" size="icon" className="w-auto px-4 text-sm font-normal text-muted-foreground" onClick={onSkip}>Skip</Button> : null}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
