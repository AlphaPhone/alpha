import type { ComponentProps } from "react";
import { Workflow } from "lucide-react";
import { HomeCard, type HomeCardLine, HomeCardLines } from "./HomeCard.tsx";

/** How current Workflows' rows are. */
export type HomeWorkflowsFreshness = "UpToDate" | "NotCurrent" | "Stale" | "SomeUnavailable";

export type HomeWorkflowsCardProps = Omit<ComponentProps<"button">, "children" | "title"> & {
  /** The first two enabled workflows, shown by name. */
  lines: readonly HomeCardLine[];
  /** How many more are enabled. */
  more: number;
  /** How current they are. */
  freshness: HomeWorkflowsFreshness;
};

const marks: Record<HomeWorkflowsFreshness, string | undefined> = {
  UpToDate: undefined,
  NotCurrent: "Not current",
  Stale: "Stale",
  SomeUnavailable: "Some unavailable",
};

/** The Workflows card: the first two enabled workflows, and at its foot how many more or how current they are; a press opens Workflows. */
export function HomeWorkflowsCard({ lines, more, freshness, ...props }: HomeWorkflowsCardProps) {
  const foot = marks[freshness] ?? (more > 0 ? `+${more} more` : "View workflows");
  return (
    <HomeCard icon={<Workflow />} status={foot} {...props}>
      <HomeCardLines lines={lines.map(({ title }) => ({ title, detail: "" }))} />
    </HomeCard>
  );
}
