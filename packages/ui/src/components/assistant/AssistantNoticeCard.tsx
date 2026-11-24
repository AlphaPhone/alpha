import { Info } from "lucide-react";
import { AssistantCardFrame } from "./AssistantCardFrame.tsx";

export type AssistantNoticeCardProps = {
  /** What Alpha is telling the owner. */
  title: string;
  /** More about it, in a line. */
  detail?: string;
};

/** A notice in a reply. It opens nothing and asks nothing. */
export function AssistantNoticeCard({ title, detail }: AssistantNoticeCardProps) {
  return <AssistantCardFrame role="note" icon={<Info />} title={title} detail={detail} />;
}
