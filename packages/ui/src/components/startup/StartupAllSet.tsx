import type { ReactNode } from "react";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { Alert } from "../Alert.tsx";
import { Button } from "../Button.tsx";
import { Sheet, SheetContent } from "../Sheet.tsx";
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
  const Icon = attention ? TriangleAlert : CircleCheck;
  return (
    <Sheet open>
      <SheetContent
        title="All set"
        aria-describedby={undefined}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          onDone?.();
        }}
        actions={<Button disabled={!onDone} onClick={onDone}>Done</Button>}
      >
        <div className="flex flex-col items-center gap-4 py-2">
          <Icon aria-hidden className={attention ? "size-10 text-warn" : "size-10 text-ok"} />
          {trouble ? <Alert variant="warn" className="w-full">{troubles[trouble]}</Alert> : null}
          {notSaved ? <Alert variant="warn" className="w-full">Not saved</Alert> : null}
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
