import { ListChecks, LogIn, RotateCcw, Server, Wallet } from "lucide-react";
import { Button } from "../Button.tsx";
import { StatusDot } from "../StatusDot.tsx";
import { AssistantCardFrame, type AssistantCardFrameProps } from "./AssistantCardFrame.tsx";

export type AssistantActionCardProps = Pick<AssistantCardFrameProps, "settled"> & {
  /** What Alpha needs: a plan to follow, a sign-in, a retry, a provider to choose or funds to add. */
  action: "plan" | "signIn" | "retry" | "provider" | "funding";
  /** What happened or what is needed. */
  title: string;
  /** One line more. */
  detail?: string;
  /** The steps of a plan, in order. */
  steps?: string[];
  /** The words of the button; each action has its own when left out. */
  label?: string;
  /** The button was pressed and has not been answered. */
  waiting?: boolean;
  /** The conversation could not take a retry; the card is live to try again. */
  notTaken?: boolean;
  /** Does what the card asks: opens where it is done, or for a retry asks the conversation. */
  onAct?: () => void;
};

const kinds = {
  plan: { icon: <ListChecks />, label: "Open plan" },
  signIn: { icon: <LogIn />, label: "Sign in" },
  retry: { icon: <RotateCcw />, label: "Retry" },
  provider: { icon: <Server />, label: "Choose provider" },
  funding: { icon: <Wallet />, label: "Add funds" },
};

/**
 * What a reply needs of the owner to carry on: follow a plan, sign in, retry, choose a provider or add funds. Only the latest reply is answered.
 * @model spec/app/assistant/cards.md
 */
export function AssistantActionCard({ action, title, detail, steps = [], label, waiting = false, notTaken = false, onAct, settled }: AssistantActionCardProps) {
  const kind = kinds[action];
  return (
    <AssistantCardFrame
      icon={kind.icon}
      title={title}
      detail={detail}
      settled={settled}
      actions={onAct ? <Button variant={action === "retry" ? "outline" : "primary"} loading={waiting} onClick={onAct}>{label ?? kind.label}</Button> : null}
    >
      {steps.length ? (
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm marker:text-muted-foreground">
          {steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      ) : null}
      {notTaken && !waiting ? <StatusDot status="warn" label="Not sent, try again" showLabel /> : null}
    </AssistantCardFrame>
  );
}
