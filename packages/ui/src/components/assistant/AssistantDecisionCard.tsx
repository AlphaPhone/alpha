import { CalendarClock, ClipboardCheck } from "lucide-react";
import { Button } from "../Button.tsx";
import { AssistantCardFrame, type AssistantCardFrameProps } from "./AssistantCardFrame.tsx";

export type AssistantDecisionCardProps = Pick<AssistantCardFrameProps, "settled"> & {
  /** A proposal for the owner to decide, or a change to the calendar to review. */
  variant: "proposal" | "review";
  /** What is proposed or changed. */
  title: string;
  /** What it means, a line or two. */
  detail?: string;
  /** The words of the button; "Review" when left out. */
  action?: string;
  /** The card has been handed on and its decider has not answered. */
  waiting?: boolean;
  /** Hands the card to the area that decides it: the card never decides. */
  onHandOn?: () => void;
};

const icons = { proposal: <ClipboardCheck />, review: <CalendarClock /> };

/**
 * A proposal or a calendar change in a reply. It is handed to approvals or to Calendar and settles on what they decide.
 * @model spec/app/assistant/cards.md
 */
export function AssistantDecisionCard({ variant, title, detail, action = "Review", waiting = false, onHandOn, settled }: AssistantDecisionCardProps) {
  return (
    <AssistantCardFrame
      icon={icons[variant]}
      title={title}
      detail={detail}
      settled={settled}
      actions={onHandOn ? <Button variant="primary" loading={waiting} onClick={onHandOn}>{action}</Button> : null}
    />
  );
}
