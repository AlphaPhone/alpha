import type { ComponentProps } from "react";
import { Newspaper } from "lucide-react";
import { StatusDot } from "../StatusDot.tsx";
import { HomeCard } from "./HomeCard.tsx";

export type HomeBriefCardProps = Omit<ComponentProps<"button">, "children" | "title"> & {
  /** The brief kept for Home finished, or its run failed. */
  outcome: "Finished" | "RunFailed";
  /** What the brief says; shown when it finished. */
  summary?: string;
  /** When it ran, such as "7:00 AM". */
  when: string;
};

/** The brief card: the latest brief, or that its run failed; a press opens Workflows. */
export function HomeBriefCard({ outcome, summary, when, ...props }: HomeBriefCardProps) {
  return (
    <HomeCard title="Brief" icon={<Newspaper />} {...props}>
      {outcome === "Finished"
        ? <span className="line-clamp-4 text-base break-words">{summary}</span>
        : <StatusDot status="error" label="Didn't run" showLabel className="text-base" />}
      <span className="mt-auto text-sm text-muted-foreground">{when}</span>
    </HomeCard>
  );
}
