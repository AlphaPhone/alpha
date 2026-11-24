import { StickyNote } from "lucide-react";
import { AssistantCardFrame, type AssistantCardFrameProps } from "./AssistantCardFrame.tsx";

export type AssistantNoteCardProps = Pick<AssistantCardFrameProps, "settled" | "onOpen"> & {
  /** The note's text; the first lines show. */
  body: string;
};

/** A note a reply names or has written; pressing it opens the note in Notes. */
export function AssistantNoteCard({ body, ...frame }: AssistantNoteCardProps) {
  return <AssistantCardFrame icon={<StickyNote />} title={body} {...frame} />;
}
