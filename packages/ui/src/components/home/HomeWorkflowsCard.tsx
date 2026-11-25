import type { ComponentProps } from "react";
import { Workflow } from "lucide-react";
import { HomeCard, type HomeCardLine, HomeCardLines } from "./HomeCard.tsx";

/** How current Workflows' rows are. */
export type HomeWorkflowsFreshness = "UpToDate" | "NotCurrent" | "Stale" | "SomeUnavailable";

export type HomeWorkflowsCardProps = Omit<ComponentProps<"button">, "children" | "title"> & {
  /** The first two enabled workflows: name over status. */
  lines: readonly HomeCardLine[];
  /** How many more are enabled. */
  more: number;
  /** How current they are. */
  freshness: HomeWorkflowsFreshness;
};

const marks: Record<HomeWorkflowsFreshness, string | undefined> = {
  UpToDate: undefined,
  NotCurrent: "Not up to date",
  Stale: "Out of date",
  SomeUnavailable: "Some unavailable",
};

/** The Workflows card: the first two enabled workflows and how many more; a press opens Workflows. */
export function HomeWorkflowsCard({ lines, more, freshness, ...props }: HomeWorkflowsCardProps) {
  return (
    <HomeCard icon={<Workflow />} notCurrent={marks[freshness]} {...props}>
      <HomeCardLines lines={lines} />
      {more > 0 ? <span className="text-sm text-muted-foreground">+{more} more</span> : null}
    </HomeCard>
  );
}
