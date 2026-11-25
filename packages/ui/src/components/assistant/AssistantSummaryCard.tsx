import { Bookmark, ChevronRight } from "lucide-react";
import { cn } from "../../lib/cn.ts";
import { Button } from "../Button.tsx";
import { StatusDot } from "../StatusDot.tsx";
import type { AssistantCardFrameProps } from "./AssistantCardFrame.tsx";

/** Where saving to Notes stands: not tried, being saved, saved, refused, or perhaps saved because nobody can tell. */
export type AssistantSummarySave = "idle" | "saving" | "saved" | "refused" | "unknown";

export type AssistantSummaryCardProps = Pick<AssistantCardFrameProps, "settled"> & {
  /** What the summary is of. */
  title: string;
  /** The points of the summary, one each. */
  bullets: string[];
  /** Where saving to Notes stands. */
  save?: AssistantSummarySave;
  /** Saves the summary to Notes; offered only while saving is allowed: never after it was saved or might have been. */
  onSave?: () => void;
  /** Hands the summary to a new email. */
  onUseInEmail?: () => void;
};

const outcome = {
  saved: { status: "ok", label: "Saved to Notes" },
  refused: { status: "error", label: "Not saved" },
  unknown: { status: "warn", label: "May be saved" },
} as const;

/**
 * A summary in a reply: its points, with Save to Notes once and Use in email.
 * @model spec/app/assistant/cards.md
 */
export function AssistantSummaryCard({ title, bullets, save = "idle", onSave, onUseInEmail, settled = false }: AssistantSummaryCardProps) {
  const told = save === "saved" || save === "refused" || save === "unknown" ? outcome[save] : undefined;
  const live = !settled && (onSave || onUseInEmail);
  return (
    <div className="flex w-full flex-col gap-3 rounded-tile bg-secondary p-4 text-secondary-foreground">
      <span className="sr-only">{title}</span>
      <ul className="flex flex-col gap-3">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-3">
            <span aria-hidden className={cn("mt-2 size-1.5 shrink-0 rounded-full", settled ? "bg-muted-foreground" : "bg-alpha")} />
            <span className={cn("min-w-0 text-base leading-details break-words", settled && "text-muted-foreground")}>{bullet}</span>
          </li>
        ))}
      </ul>
      {told ? <StatusDot status={told.status} label={told.label} showLabel /> : null}
      {live ? (
        <div className="flex justify-end gap-2">
          {onSave ? <Button variant="ghost" size="icon" aria-label="Save to Notes" loading={save === "saving"} className="rounded-full bg-background text-primary hover:bg-background/80" onClick={onSave}><Bookmark aria-hidden /></Button> : null}
          {onUseInEmail ? <Button variant="ghost" size="icon" aria-label="Use in email" className="rounded-full bg-background hover:bg-background/80" onClick={onUseInEmail}><ChevronRight aria-hidden /></Button> : null}
        </div>
      ) : null}
    </div>
  );
}
