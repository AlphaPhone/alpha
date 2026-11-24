import { Play } from "lucide-react";
import { StatusDot, type StatusDotProps } from "../StatusDot.tsx";
import { AssistantCardFrame, type AssistantCardFrameProps } from "./AssistantCardFrame.tsx";

export type AssistantRun = {
  /** Keeps the run in place between replies. */
  id: string;
  /** The workflow that ran. */
  title: string;
  /** How it ended: its colour and shape. */
  status: StatusDotProps["status"];
  /** The state in a word, such as "Done": the shape's accessible name. */
  label: string;
  /** When it ran. */
  when?: string;
};

export type AssistantRunsCardProps = Pick<AssistantCardFrameProps, "settled" | "onOpen"> & {
  /** What the card says, such as "Workflow runs". */
  title: string;
  /** The runs, newest first. */
  runs: AssistantRun[];
};

/** The runs of workflows a reply reports; pressing its head opens Workflows. */
export function AssistantRunsCard({ title, runs, ...frame }: AssistantRunsCardProps) {
  return (
    <AssistantCardFrame icon={<Play />} title={title} {...frame}>
      <ul className="flex flex-col gap-2">
        {runs.map((run) => (
          <li key={run.id} className="flex items-center gap-3">
            <StatusDot status={run.status} label={run.label} />
            <span className="min-w-0 flex-1 break-words">{run.title}</span>
            {run.when ? <span className="shrink-0 text-sm text-muted-foreground">{run.when}</span> : null}
          </li>
        ))}
      </ul>
    </AssistantCardFrame>
  );
}
