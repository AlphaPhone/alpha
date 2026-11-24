import { Alert } from "../Alert.tsx";
import { Button } from "../Button.tsx";
import { ListGroup } from "../ListGroup.tsx";
import { Progress } from "../Progress.tsx";
import { Sheet, SheetContent } from "../Sheet.tsx";
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

const notices: Record<StartupAccessNotice, { text: string; variant: "info" | "warn" }> = {
  AllowFirst: { text: "Allow first", variant: "info" },
  StillOff: { text: "Still off", variant: "warn" },
  NotConfirmed: { text: "Couldn't confirm", variant: "warn" },
  NotSaved: { text: "Not saved", variant: "warn" },
};

/**
 * The walkthrough that asks for each access in order, or a review of them from Settings: one list, the step being
 * asked carrying its action, Continue and Skip, or Done. It stands over Home, which is held still beneath it.
 * @model spec/app/startup/access.md
 */
export function StartupAccessPanel({ rows, current, review = false, place, notice, onAct, onContinue, onSkip, onDone }: StartupAccessPanelProps) {
  const said = notice ? notices[notice] : undefined;
  return (
    <Sheet open>
      <SheetContent
        title="Access"
        aria-describedby={undefined}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          if (review) onDone?.();
        }}
        actions={
          review ? (
            <Button disabled={!onDone} onClick={onDone}>Done</Button>
          ) : (
            <>
              {onSkip ? <Button variant="secondary" onClick={onSkip}>Skip</Button> : null}
              <Button disabled={!onContinue} onClick={onContinue}>Continue</Button>
            </>
          )
        }
      >
        <div className="flex flex-col gap-4">
          {place ? <Progress aria-label={`Step ${place.step} of ${place.count}`} value={place.step} max={place.count} /> : null}
          <ListGroup surface="plain">
            {rows.map((row) => (
              <StartupAccessRow key={row.access} {...row} current={row.access === current} onAct={onAct && row.action ? () => onAct(row.access) : undefined} />
            ))}
          </ListGroup>
          {said ? <Alert variant={said.variant}>{said.text}</Alert> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
