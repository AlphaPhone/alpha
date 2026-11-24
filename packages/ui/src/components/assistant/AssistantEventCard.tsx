import { CalendarDays } from "lucide-react";
import { AssistantCardFrame, type AssistantCardFrameProps } from "./AssistantCardFrame.tsx";

export type AssistantEventCardProps = Pick<AssistantCardFrameProps, "settled" | "onOpen"> & {
  /** What the event is. */
  title: string;
  /** When it is, in words the owner reads. */
  time: string;
};

/** An event of the calendar that a reply names; pressing it opens the event in Calendar. */
export function AssistantEventCard({ title, time, ...frame }: AssistantEventCardProps) {
  return <AssistantCardFrame icon={<CalendarDays />} title={title} detail={time} {...frame} />;
}
