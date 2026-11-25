import type { ComponentProps } from "react";
import { FileText } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import { HomeCard } from "./HomeCard.tsx";

export type HomeBriefCardProps = Omit<ComponentProps<"button">, "children" | "title"> & {
  /** The brief kept for Home finished, or its run failed. */
  outcome: "Finished" | "RunFailed";
  /** What the brief says. */
  summary?: string;
  /** Who ran it and when, such as "Your agent · Ran 7:02 AM". */
  status: string;
};

/** The brief card: the latest brief and who ran it when, or that its run failed; a press opens Workflows. */
export function HomeBriefCard({ outcome, summary, status, className, ...props }: HomeBriefCardProps) {
  const failed = outcome === "RunFailed";
  return (
    <HomeCard
      title="Latest brief"
      icon={<FileText />}
      className={cn("w-[min(100%,calc(280px_*_clamp(1,var(--alpha-text-scale,1),1.3)))] max-w-full", className)}
      {...props}
    >
      <span className="flex min-h-0 flex-1 items-center">
        <span className="line-clamp-4 text-date leading-snug font-semibold wrap-anywhere">{summary ?? "Didn't run"}</span>
      </span>
      <span className={cn("truncate text-xs leading-normal", failed ? "font-semibold text-foreground" : "text-muted-foreground")}>{status}</span>
    </HomeCard>
  );
}
