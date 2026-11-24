import type { ComponentProps } from "react";
import { FileText } from "lucide-react";
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
    <HomeCard title="Latest brief" icon={<FileText />} className="w-70" {...props}>
      <span className="flex min-h-0 flex-1 items-center">
        {outcome === "Finished"
          ? <span className="line-clamp-4 text-lg leading-snug font-semibold wrap-anywhere">{summary}</span>
          : <StatusDot status="error" label="Didn't run" showLabel className="text-base" />}
      </span>
      <span className="truncate text-xs leading-normal text-muted-foreground">{when}</span>
    </HomeCard>
  );
}
