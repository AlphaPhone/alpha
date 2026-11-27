import { CalendarClock, ClipboardCheck } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";
import { Card } from "../Card.tsx";
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
  /** Declines the proposal, offered on the card's last row beside "Keep things as they are." */
  onDecline?: () => void;
  /** Decline is shown but can't be pressed, such as while the decision is being made. */
  declineDisabled?: boolean;
};

const icons = { proposal: <ClipboardCheck />, review: <CalendarClock /> };

/**
 * A proposal or a calendar change in a reply. It is handed to approvals or to Calendar and settles on what they decide.
 * Given `onDecline`, it is v119's two-row phone-step review (Sunday's v119, Alpha 45f6bed30: `prototype/template.html:4576-4590`,
 * `prototype/phone.css:923-926`): a first row of the title and what it does with a compact button at its end and no picture, then
 * "Keep things as they are." with a grey Decline at its end.
 * @model spec/app/assistant/cards.md
 */
export function AssistantDecisionCard({ variant, title, detail, action = "Review", waiting = false, onHandOn, onDecline, declineDisabled = false, settled }: AssistantDecisionCardProps) {
  if (!onDecline) {
    return <AssistantCardFrame icon={icons[variant]} title={title} detail={detail} settled={settled}
      actions={onHandOn ? <Button variant="primary" loading={waiting} onClick={onHandOn}>{action}</Button> : null} />;
  }
  const row = "flex min-h-14 w-full items-center gap-3 px-3.5 py-3";
  return (
    <Card className="gap-0 overflow-hidden rounded-tile border-0 bg-secondary p-0 text-secondary-foreground">
      <div className={row}>
        <span className="flex min-w-0 grow flex-col gap-0.5">
          <span className={cn("text-sm font-semibold break-words", settled && "text-muted-foreground")}>{title}</span>
          {detail ? <span className="text-meta leading-details break-words text-muted-foreground">{detail}</span> : null}
        </span>
        {settled || !onHandOn ? null : <Button variant="primary" size="sm" loading={waiting} onClick={onHandOn}>{action}</Button>}
      </div>
      {settled ? null : (
        <div className={cn(row, "border-t border-border")}>
          <span className="min-w-0 grow text-meta leading-details text-muted-foreground">Keep things as they are.</span>
          <button type="button" disabled={declineDisabled} onClick={onDecline}
            className="inline-flex min-h-9 shrink-0 items-center rounded-action bg-accent px-4 text-sm font-semibold text-foreground disabled:cursor-default disabled:opacity-50">Decline</button>
        </div>
      )}
    </Card>
  );
}
