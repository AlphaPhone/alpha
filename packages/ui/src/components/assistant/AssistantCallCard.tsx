import { Phone } from "lucide-react";
import { AssistantCardFrame, type AssistantCardFrameProps } from "./AssistantCardFrame.tsx";

export type AssistantCallCardProps = Pick<AssistantCardFrameProps, "settled" | "onOpen"> & {
  /** Who the call is with. */
  who: string;
  /** How it went or goes, in a few words. */
  detail?: string;
};

/** A call a reply names; pressing it opens the call in Phone. */
export function AssistantCallCard({ who, detail, ...frame }: AssistantCallCardProps) {
  return <AssistantCardFrame icon={<Phone />} title={who} detail={detail} {...frame} />;
}
