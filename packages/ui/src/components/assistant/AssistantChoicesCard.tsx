import { MapPin } from "lucide-react";
import { Button } from "../Button.tsx";
import { StatusDot } from "../StatusDot.tsx";
import { AssistantCardFrame, type AssistantCardFrameProps } from "./AssistantCardFrame.tsx";

export type AssistantChoicesCardProps = Pick<AssistantCardFrameProps, "settled"> & {
  /** What Alpha asks the owner to choose, such as "Share your location?". */
  title: string;
  /** The choices, in order. */
  options: string[];
  /** A choice was made and the conversation has not yet said whether it took it. */
  waiting?: boolean;
  /** The conversation could not take the last choice; the card is live to try again. */
  notTaken?: boolean;
  /** Asks the conversation for a choice, by its place in the list from 1. */
  onChoose?: (option: number) => void;
};

/**
 * Choices a reply offers for a place or for sharing location; one is answered once, and only the latest reply is answered.
 * @model spec/app/assistant/cards.md
 */
export function AssistantChoicesCard({ title, options, waiting = false, notTaken = false, onChoose, settled }: AssistantChoicesCardProps) {
  return (
    <AssistantCardFrame
      icon={<MapPin />}
      title={title}
      settled={settled}
      role="group"
      aria-label={title}
      actions={options.map((option, index) => (
        <Button key={option} variant="outline" disabled={waiting || !onChoose} onClick={() => onChoose?.(index + 1)}>{option}</Button>
      ))}
    >
      {notTaken && !waiting ? <StatusDot status="warn" label="Not sent, try again" showLabel /> : null}
    </AssistantCardFrame>
  );
}
