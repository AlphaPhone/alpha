import { MapPin } from "lucide-react";
import { AssistantCardFrame, type AssistantCardFrameProps } from "./AssistantCardFrame.tsx";

export type AssistantPlaceCardProps = Pick<AssistantCardFrameProps, "settled" | "onOpen"> & {
  /** The place's name. */
  title: string;
  /** Its address, distance or hours, a line each. */
  lines?: string[];
  /** Where the map data comes from. */
  attribution?: string;
};

/** A place on a map that a reply names; pressing it opens the place in Maps. */
export function AssistantPlaceCard({ title, lines = [], attribution, ...frame }: AssistantPlaceCardProps) {
  return (
    <AssistantCardFrame icon={<MapPin />} title={title} {...frame}>
      {lines.map((line) => <p key={line} className="text-sm text-muted-foreground">{line}</p>)}
      {attribution ? <p className="text-xs text-muted-foreground">{attribution}</p> : null}
    </AssistantCardFrame>
  );
}
