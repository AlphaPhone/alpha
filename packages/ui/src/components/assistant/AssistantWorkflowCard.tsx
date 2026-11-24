import { Workflow } from "lucide-react";
import { AssistantCardFrame, type AssistantCardFrameProps } from "./AssistantCardFrame.tsx";

export type AssistantWorkflowCardProps = Pick<AssistantCardFrameProps, "settled" | "onOpen"> & {
  /** The workflow's name. */
  name: string;
  /** What it does, in a line. */
  summary: string;
};

/** A workflow a reply proposes or has set up; pressing it opens the workflow in Workflows. */
export function AssistantWorkflowCard({ name, summary, ...frame }: AssistantWorkflowCardProps) {
  return <AssistantCardFrame icon={<Workflow />} title={name} detail={summary} {...frame} />;
}
