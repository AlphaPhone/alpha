// spec/shell/permissions.md, "Story: Grant Alpha what it needs, when I choose"; spec/account/session.md, "A new account, and an earlier sign-in left unconfirmed, are told for the sign-in that reported them"; spec/account/plan.md, "The Ready card names a missing plan, AI being checked and AI off, and only a missing plan or AI off asks for attention"
import { Bot, CreditCard, KeyRound, ServerOff, UserRoundPlus } from "lucide-react";
import type { ReadyChips } from "../../account/bindings.vibe";
import { Spinner } from "../components/ui/index.ts";

/** The account chips the Ready card shows. */
export interface AccountChipsProps {
  chips: ReadyChips;
}

/** Nothing to say of the account: no chip shows. */
export const quietChips: ReadyChips = { ai: "NoAiChip", agentDown: false, checkSignIn: false, created: false, email: undefined };

const chipClass = "flex items-center gap-2 font-mono text-xs uppercase tracking-widest";

/**
 * The account's chips on the access walkthrough's Ready card: no plan, AI checking or off, a stopped agent, a sign-in to
 * check, and a new account with its email.
 * @model spec/account/session.md
 * @design design.md
 */
export function AccountChips({ chips }: AccountChipsProps) {
  const { ai, agentDown, checkSignIn, created, email } = chips;
  if (ai === "NoAiChip" && !agentDown && !checkSignIn && !created) return null;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {ai === "NoPlanChip" && <p role="status" className={`${chipClass} text-warn`}><CreditCard aria-hidden className="size-4" />No plan</p>}
      {ai === "AiCheckingChip" && <p role="status" className={`${chipClass} text-muted-foreground`}><Spinner size="sm" label="Checking AI" />AI · checking</p>}
      {ai === "AiOffChip" && <p role="status" className={`${chipClass} text-muted-foreground`}><Bot aria-hidden className="size-4" />AI off</p>}
      {agentDown && <p role="alert" className={`${chipClass} text-warn`}><ServerOff aria-hidden className="size-4" />Agent not running</p>}
      {checkSignIn && <p role="status" className={`${chipClass} text-warn`}><KeyRound aria-hidden className="size-4" />Check sign-in</p>}
      {created && (
        <p role="status" className="flex items-center gap-2 text-sm">
          <UserRoundPlus aria-hidden className="size-4" /><span className="sr-only">New account </span>{email ?? "New account"}
        </p>
      )}
    </div>
  );
}
