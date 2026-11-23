// spec/assistant/reply.md, "A recognized tool block outside a fence becomes its card; inside a fence it stays code"
import type { MapsCard } from "@elizaos/plugin-maps/cards";
import { CalendarClock, Workflow } from "lucide-react";
import { render } from "../../../gen/assistant__reply.ts";
import type { Segment } from "../../assistant/reply-lines.vibe";
import { Button } from "../components/ui/index.ts";
import { MapsCard as MapsCardView } from "../maps/MapsCard.tsx";

/** A reply's classified lines and what its cards may do. */
export type ReplyTextProps = {
  /** The reply's classified lines. */
  segments: readonly Segment[];
  /** Answer a share choice with its value, as a message the owner sends. */
  onChoose?: (value: string) => void;
  /** Open a workflow run the reply announced. */
  onOpenRun?: (workflowId: string, runId: string) => void;
  /** The reply is the newest agent message, so its Maps cards may open their map. */
  live?: boolean;
  /** Open the map a Maps card carries. */
  onOpenMap?: (card: MapsCard) => void;
  /** Open Calendar's review of a change the agent queued for approval. */
  onReviewApproval?: (requestId: string) => void;
};

type Block = { readonly kind: "text" | "code"; readonly lines: string[] } | { readonly kind: "card"; readonly segment: Segment };

function blocksOf(segments: readonly Segment[]): Block[] {
  const pieces = render(segments.map((segment) => segment.line));
  const blocks: Block[] = [];
  pieces.forEach((piece, at) => {
    const segment = segments[at];
    if (segment === undefined || piece.tag === "Hidden") return;
    if (piece.tag === "Card") { blocks.push({ kind: "card", segment }); return; }
    const kind = piece.tag === "Code" ? "code" : "text";
    const last = blocks.at(-1);
    if (last !== undefined && last.kind === kind) last.lines.push(segment.text);
    else blocks.push({ kind, lines: [segment.text] });
  });
  return blocks;
}

/**
 * A reply's text with its cards: prose as written, code fences verbatim, recognized tool blocks as cards.
 * @model spec/assistant/reply.md
 */
export function ReplyText({ segments, onChoose, onOpenRun, live = false, onOpenMap, onReviewApproval }: ReplyTextProps) {
  return (
    <div className="flex flex-col gap-2">
      {blocksOf(segments).map((block, at) => {
        if (block.kind === "text") return <p key={at} className="font-legible whitespace-pre-wrap">{block.lines.join("\n").trim()}</p>;
        if (block.kind !== "card") return <pre key={at} className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs"><code>{block.lines.filter((line) => !/^[ \t]{0,3}(`{3,}|~{3,})/.test(line)).join("\n")}</code></pre>;
        const { payload } = block.segment;
        if (payload.kind === "maps") return <MapsCardView key={at} card={payload.card} live={live && onOpenMap !== undefined} onOpenMap={() => onOpenMap?.(payload.card)} />;
        if (payload.kind === "workflow") return <Button key={at} variant="outline" aria-label={`Open workflow run ${payload.run.title}`} onClick={() => onOpenRun?.(payload.run.workflowId, payload.run.runId)}><Workflow aria-hidden className="size-4" />{payload.run.title}</Button>;
        if (payload.kind === "calendar-approval") return <Button key={at} variant="outline" aria-label="Review Calendar request" disabled={onReviewApproval === undefined} onClick={() => onReviewApproval?.(payload.requestId)}><CalendarClock aria-hidden className="size-4" />Needs your approval · Review</Button>;
        if (payload.kind === "choice") return <div key={at} className="flex gap-2">{payload.options.map((option) => <Button key={option.value} variant="secondary" onClick={() => onChoose?.(option.value)}>{option.label}</Button>)}</div>;
        return null;
      })}
    </div>
  );
}
