import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { Button } from "../Button.tsx";
import { Dialog, DialogContent, DialogTitle } from "../Dialog.tsx";
import { startupHeading, startupMainAction, useStartupPanel } from "./StartupAccessPanel.tsx";
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
  const { heading, content } = useStartupPanel(() => onDone?.());
  return (
    <Dialog open>
      <DialogContent {...content}>
        <div className="m-auto flex w-full max-w-90 flex-col items-center text-center">
          <span aria-hidden className="relative mb-7 grid size-20 place-items-center rounded-full bg-secondary [@media(max-height:500px)]:mb-4 [@media(max-height:500px)]:size-14">
            <Check className="size-9 [@media(max-height:500px)]:size-7" />
            {attention ? <span className="absolute top-1.5 right-1.5 size-3.5 rounded-full border-2 border-background bg-warn" /> : null}
          </span>
          <DialogTitle ref={heading} tabIndex={-1} className={startupHeading}>All set</DialogTitle>
          <div className="flex flex-col items-center gap-2 text-sm">
            {trouble ? <p role="alert">{troubles[trouble]}</p> : null}
            {notSaved ? <p role="alert">Not saved</p> : null}
            {children}
          </div>
          <div className="mt-9 min-h-27 w-full [@media(max-height:500px)]:mt-5">
            <Button className={startupMainAction} disabled={!onDone} onClick={onDone}>Done</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
