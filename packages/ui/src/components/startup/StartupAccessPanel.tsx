import { type ComponentProps, useRef } from "react";
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
  /** Whether the current permission is confirmed ready. */
  continueReady?: boolean;
  /** Android's Location rationale includes Alpha chat. */
  native?: boolean;
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
  NotConfirmed: "Couldn’t confirm",
  NotSaved: "Not saved",
};

const startupPanel = "inset-0 grid max-h-none max-w-none translate-y-0 overflow-y-auto overscroll-contain rounded-none border-0 bg-background pr-[max(--spacing(6),env(safe-area-inset-right))] pl-[max(--spacing(6),env(safe-area-inset-left))] pt-[max(--spacing(8),var(--alpha-safe-top))] pb-[max(--spacing(8),var(--alpha-safe-bottom))] text-foreground shadow-none motion-safe:animate-none [@media(max-height:500px)]:p-5";
export const startupHeading = "mb-5 text-center font-display text-[clamp(40px,7vw,56px)] leading-[1.05] font-light tracking-[-.025em] text-balance outline-none [@media(max-height:500px)]:mb-3 [@media(max-height:500px)]:text-[36px]";
export const startupMainAction = "h-13 w-full rounded-md bg-primary text-base leading-tight font-medium text-primary-foreground hover:bg-primary hover:brightness-[.94] active:bg-primary disabled:opacity-45";

/**
 * What a startup panel gives its dialog: the panel's place on screen, its heading taking focus as it opens, a press
 * outside it ignored, and Escape doing `onEscape`.
 */
export function useStartupPanel(onEscape: () => void) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const content: ComponentProps<typeof DialogContent> = {
    className: startupPanel,
    "aria-describedby": undefined,
    onOpenAutoFocus: (event) => {
      event.preventDefault();
      headingRef.current?.focus({ preventScroll: true });
    },
    onInteractOutside: (event) => event.preventDefault(),
    onEscapeKeyDown: (event) => {
      event.preventDefault();
      onEscape();
    },
  };
  return { heading: headingRef, content };
}

/**
 * The walkthrough that asks for each access in order, or a review of them from Settings: one list, the step being
 * asked carrying its action, Continue and Skip, or Done. It stands over Home, which is held still beneath it.
 * @model spec/app/startup/access.md
 */
export function StartupAccessPanel({ rows, current, review = false, place, continueReady = true, native, notice, onAct, onContinue, onSkip, onDone }: StartupAccessPanelProps) {
  const said = notice ? notices[notice] : undefined;
  const { heading, content } = useStartupPanel(() => {
    if (review) onDone?.();
  });
  return (
    <Dialog open>
      <DialogContent {...content}>
        <div className="m-auto flex w-full max-w-90 flex-col">
          <DialogTitle ref={heading} tabIndex={-1} className={startupHeading}>Access</DialogTitle>
          {place ? <p role="status" className="mb-2 text-center text-sm leading-chat text-muted-foreground">Step {place.step} of {place.count}</p> : null}
          <ol>
            {rows.map((row) => (
              <StartupAccessRow key={row.access} {...row} native={native} current={row.access === current} onAct={onAct && row.action ? () => onAct(row.access) : undefined} />
            ))}
          </ol>
          {said ? <p role={notice === "NotSaved" ? "alert" : "status"} className="mt-5 text-center text-sm">{said}</p> : null}
          <div className="mt-9 flex min-h-27 flex-col items-center gap-2 [@media(max-height:500px)]:mt-5">
            {review ? (
              <Button className={startupMainAction} disabled={!onDone} onClick={onDone}>Done</Button>
            ) : (
              <>
                <Button className={`${startupMainAction} aria-disabled:pointer-events-auto aria-disabled:opacity-45`}
                  aria-disabled={!continueReady || undefined} disabled={!onContinue} onClick={onContinue}>Continue</Button>
                {onSkip ? <Button variant="ghost" size="icon" className="w-auto px-4 text-sm font-normal text-muted-foreground" onClick={onSkip}>Skip</Button> : null}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
