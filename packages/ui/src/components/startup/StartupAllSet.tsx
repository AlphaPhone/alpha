import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { Button } from "../Button.tsx";
import { Dialog, DialogContent, DialogTitle } from "../Dialog.tsx";
import { startupMainAction, startupPanel } from "./StartupAccessPanel.tsx";
import type { StartupTrouble } from "./vocabulary.ts";

export type StartupAllSetProps = {
  /** What went wrong, for an account that is not new; a new account's has nothing to say. */
  trouble?: StartupTrouble;
  /** The walkthrough's progress could not be saved. */
  notSaved?: boolean;
  /** The plan and AI state the account area reports, shown as it gives them. */
  children?: ReactNode;
  /** Ends "All set" and goes Home. */
  onDone?: () => void;
};

const troubles: Record<StartupTrouble, string> = {
  ConnectionFailed: "Connection failed",
  SignInNeedsAttention: "Check sign-in",
};

/**
 * The end of the walkthrough for a new account, or for one whose connection or sign-in needed attention, which it
 * says. Done goes Home.
 * @model spec/app/startup/access.md
 */
export function StartupAllSet({ trouble, notSaved = false, children, onDone }: StartupAllSetProps) {
  const attention = trouble !== undefined || notSaved;
  return (
    <Dialog open>
      <DialogContent
        className={startupPanel}
        aria-describedby={undefined}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          onDone?.();
        }}
      >
        <div className="m-auto flex w-full max-w-90 flex-col items-center text-center">
          <span aria-hidden className="relative mb-7 grid size-20 place-items-center rounded-full bg-secondary">
            <Check className="size-9" />
            {attention ? <span className="absolute top-1.5 right-1.5 size-3.5 rounded-full border-2 border-background bg-warn" /> : null}
          </span>
          <DialogTitle className="mb-5 font-display text-4xl font-light">All set</DialogTitle>
          <div className="flex flex-col items-center gap-2 text-sm">
            {trouble ? <p role="alert">{troubles[trouble]}</p> : null}
            {notSaved ? <p role="alert">Not saved</p> : null}
            {children}
          </div>
          <div className="mt-9 min-h-27 w-full">
            <Button className={startupMainAction} disabled={!onDone} onClick={onDone}>Done</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
