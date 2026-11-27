// spec/app/assistant/reply.md, "A failed reply offers the fix the agent named, and a limit reached shows its live wait, never sending the message again"; spec/app/assistant/reply.md, "A reply cut off after an action took effect says it was done, or that it needs approval when all it did was ask for approval"; spec/app/assistant/reply.md, "Each step the agent marked untold draws Alpha's step notice under its reply, live and read again, and a reply with no text that marks one is answered, never declined"
import { AssistantCard } from "@repo/ui";
import type { CutOff, Failure, Fix } from "../../gen/app__assistant__reply.effect.vibe";
import { fixShown, managesPlan, showsWait, waitSeconds } from "../../gen/app__assistant__reply.ts";

const failures: Record<Failure, string> = {
  CredentialInvalid: "Your provider refused its key", InsufficientCredits: "Out of credits", LimitReached: "Too many requests",
  ProviderIssue: "The provider had a problem", TimedOut: "The reply timed out", MissingCapability: "Your agent cannot do that yet",
  NoProvider: "No AI provider", OutOfFunds: "You’re out of plan allowance and credits, so I couldn’t reply.",
  OtherFailure: "The reply did not finish",
};

const cutOffs: Record<CutOff, string | undefined> = {
  NotCutOff: undefined,
  DoneCutOff: "Done · reply cut off",
  NeedsApprovalCutOff: "Needs your approval · reply cut off",
};

function about(waitMs: number): string {
  const seconds = waitSeconds(waitMs);
  if (seconds < 90) return `${seconds} s`;
  const minutes = Math.round(seconds / 60);
  return minutes < 90 ? `${minutes} min` : `${Math.round(minutes / 60)} h`;
}

function actionOf(kind: Failure, fix: Fix): "signIn" | "funding" | "retry" | undefined {
  if (fix === "SignInFix") return "signIn";
  if (fix === "FundingFix" || (fix === "NoFix" && managesPlan(kind))) return "funding";
  if (fix === "RetryFix") return "retry";
  return undefined;
}

interface ReplyFailureProps {
  kind: Failure;
  fix?: Fix;
  waitMs?: number;
  live?: boolean;
  cutOff?: CutOff;
  onRetry?: () => void;
  onSettings?: () => void;
}

/** The agent's reason a reply stopped and the action available for it. */
export function ReplyFailure({ kind, fix = "NoFix", waitMs = -1, live = false, cutOff = "NotCutOff", onRetry, onSettings }: ReplyFailureProps) {
  const action = actionOf(kind, fix);
  const wait = showsWait(kind, waitMs) ? `Try again in about ${about(waitMs)}` : !live && kind === "LimitReached" ? "Wait a moment, then try again" : undefined;
  const detail = [cutOffs[cutOff], wait].filter((part): part is string => part !== undefined).join(". ") || undefined;
  const title = failures[kind];
  return <AssistantCard
    card={action === undefined || !fixShown(fix, kind)
      ? { kind: "plain", text: detail === undefined ? title : `${title}. ${detail}` }
      : { kind: "action", action, title, ...(detail === undefined ? {} : { detail }), ...(action === "funding" ? { label: "Manage plan" } : {}) }}
    onAct={action === "retry" ? onRetry : action !== undefined ? onSettings : undefined}
  />;
}

/** A step's action as Alpha names it in its notice: `BOOK_TABLE` reads "Book table". */
function stepName(action: string): string {
  const words = action.toLowerCase().split("_").filter((word) => word !== "").join(" ");
  return words === "" ? "A step" : `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

/** Alpha's notice, in the failed reply's style, for each step of a reply the agent marked untold. */
export function UntoldSteps({ untold }: { untold: readonly string[] }) {
  const steps = untold.map((action, at) => ({ action, earlier: untold.slice(0, at).filter((one) => one === action).length }));
  return steps.map(({ action, earlier }) => <AssistantCard key={`${action} ${earlier}`} card={{ kind: "plain", text: `${stepName(action)} did not complete` }} />);
}
