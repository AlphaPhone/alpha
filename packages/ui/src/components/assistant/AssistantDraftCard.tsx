import { Mail } from "lucide-react";
import { AssistantCardFrame, type AssistantCardFrameProps } from "./AssistantCardFrame.tsx";

export type AssistantDraftCardProps = Pick<AssistantCardFrameProps, "settled" | "onOpen"> & {
  /** Who the draft is to. */
  to: string;
  /** Its subject. */
  subject?: string;
  /** The text of the draft. */
  body: string;
};

/** A draft message a reply has written; pressing its head opens it in Inbox, where it is edited and sent. */
export function AssistantDraftCard({ to, subject, body, ...frame }: AssistantDraftCardProps) {
  return (
    <AssistantCardFrame icon={<Mail />} title={subject ?? `To ${to}`} detail={subject ? `To ${to}` : undefined} {...frame}>
      <p className="line-clamp-6 break-words whitespace-pre-line">{body}</p>
    </AssistantCardFrame>
  );
}
