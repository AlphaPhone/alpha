import { Bot } from "lucide-react";
import { AssistantCardFrame } from "./AssistantCardFrame.tsx";

export type AssistantGenericCardProps = {
  /** What the card is. */
  title: string;
  /** One line more. */
  detail?: string;
};

/** A card of a kind the phone has no face for. It shows what it says and opens nothing. */
export function AssistantGenericCard({ title, detail }: AssistantGenericCardProps) {
  return <AssistantCardFrame icon={<Bot />} title={title} detail={detail} />;
}
