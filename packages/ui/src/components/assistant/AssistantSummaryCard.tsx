import { ListChecks, Mail, NotebookPen } from "lucide-react";
import { Button } from "../Button.tsx";
import { StatusDot } from "../StatusDot.tsx";
import { AssistantCardFrame, type AssistantCardFrameProps } from "./AssistantCardFrame.tsx";

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
export function AssistantSummaryCard({ title, bullets, save = "idle", onSave, onUseInEmail, settled }: AssistantSummaryCardProps) {
  const told = save === "saved" || save === "refused" || save === "unknown" ? outcome[save] : undefined;
  return (
    <AssistantCardFrame
      icon={<ListChecks />}
      title={title}
      settled={settled}
      actions={
        <>
          {onSave ? <Button variant="outline" size="sm" loading={save === "saving"} onClick={onSave}><NotebookPen aria-hidden />Save to Notes</Button> : null}
          {onUseInEmail ? <Button variant="outline" size="sm" onClick={onUseInEmail}><Mail aria-hidden />Use in email</Button> : null}
        </>
      }
    >
      <ul className="flex flex-col gap-2">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex gap-3">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-alpha" />
            <span className="min-w-0 break-words">{bullet}</span>
          </li>
        ))}
      </ul>
      {told ? <StatusDot status={told.status} label={told.label} showLabel /> : null}
    </AssistantCardFrame>
  );
}
