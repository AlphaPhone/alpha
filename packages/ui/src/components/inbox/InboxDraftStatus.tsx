import { RotateCw } from "lucide-react";
import { cn, focusRing } from "../../lib/cn.ts";
import { StatusDot, type StatusDotProps } from "../StatusDot.tsx";

type Mark = { status: StatusDotProps["status"]; label: string };

const keeping: Record<"kept" | "writing" | "notKept" | "full", Mark> = {
  kept: { status: "ok", label: "Kept on this phone" },
  writing: { status: "busy", label: "Keeping" },
  notKept: { status: "error", label: "Not kept on this phone" },
  full: { status: "error", label: "Phone storage is full" },
};

const gmail: Record<"none" | "saved" | "unsaved" | "saving" | "clash" | "unsure", Mark | undefined> = {
  none: undefined,
  saved: { status: "ok", label: "Saved to Gmail" },
  unsaved: { status: "off", label: "Not saved to Gmail" },
  saving: { status: "busy", label: "Saving to Gmail" },
  clash: { status: "warn", label: "Changed in Gmail" },
  unsure: { status: "warn", label: "Not sure of Gmail's copy" },
};

const sent: Record<"none" | "already" | "earlier", Mark | undefined> = {
  none: undefined,
  already: { status: "ok", label: "Already sent" },
  earlier: { status: "warn", label: "Earlier version sent" },
};

export type InboxDraftStatusProps = {
  /** Whether what was typed is on the phone yet, or could not be kept. */
  keeping: "kept" | "writing" | "notKept" | "full";
  /** Where the copy in Gmail's Drafts stands. */
  gmail: "none" | "saved" | "unsaved" | "saving" | "clash" | "unsure";
  /** Whether a send of it went, and whether it was changed after. */
  sent: "none" | "already" | "earlier";
  /** Tries to keep the draft on the phone again; offered while it is not kept. */
  onRetry?: () => void;
};

/**
 * What is news about the draft: not kept on the phone, saved in Gmail, sent. Each is a shape and a word, so none is
 * told by color alone; a draft kept as it is typed says nothing.
 *
 * @model spec/app/inbox/drafts.md
 */
export function InboxDraftStatus({ keeping: kept, gmail: copy, sent: went, onRetry }: InboxDraftStatusProps) {
  const routine = kept === "kept" || kept === "writing";
  const marks = [routine ? undefined : keeping[kept], gmail[copy], sent[went]].filter((mark): mark is Mark => mark !== undefined);
  const retry = onRetry && (kept === "notKept" || kept === "full");
  if (marks.length === 0 && !retry) return null;
  return (
    <div role="status" aria-label="Draft status" className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-xs text-muted-foreground">
      {marks.map(({ status, label }) => <StatusDot key={label} status={status} label={label} showLabel />)}
      {retry ? <button type="button" onClick={onRetry} className={cn(focusRing, "inline-flex min-h-11 items-center gap-1.5 rounded-sm px-3 text-foreground")}><RotateCw aria-hidden className="size-4" />Retry</button> : null}
    </div>
  );
}
