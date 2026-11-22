// spec/assistant/reply.md, "A recognized tool block outside a fence becomes its card; inside a fence it stays code"
import type { MapsCard } from "@elizaos/plugin-maps/cards";
import { MapPin, Route, Workflow } from "lucide-react";
import { render } from "../../../gen/assistant__reply.ts";
import type { Segment } from "../../assistant/reply-lines.vibe";
import { Button, Card, CardTitle } from "../components/ui/index.ts";

export type ReplyTextProps = {
  /** The reply's classified lines. */
  segments: readonly Segment[];
  /** Answer a share choice with its value, as a message the owner sends. */
  onChoose?: (value: string) => void;
  /** Open a workflow run the reply announced. */
  onOpenRun?: (workflowId: string, runId: string) => void;
};

type Block = { readonly kind: "text" | "code"; readonly lines: string[] } | { readonly kind: "card"; readonly segment: Segment };

const modes = { drive: "Driving", walk: "Walking", bicycle: "Cycling", transit: "Transit" } as const;

function distance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
}

function duration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}

/** A Maps card in a reply; its links are shown as text and never opened from chat. */
export function MapsCardView({ card }: { card: MapsCard }) {
  switch (card.kind) {
    case "place":
      return <Card className="gap-1 p-4"><CardTitle className="flex items-center gap-2"><MapPin aria-hidden className="size-4" />{card.place.name}</CardTitle>{card.place.formattedAddress && <p className="text-sm text-muted-foreground">{card.place.formattedAddress}</p>}</Card>;
    case "places":
      return (
        <Card className="gap-2 p-4">
          <CardTitle>{card.near ? `“${card.query}” near ${card.near.name}` : `Places for “${card.query}”`}</CardTitle>
          <ul className="flex flex-col gap-1 text-sm">{card.places.map((place) => <li key={place.providerPlaceId}>{place.name}{place.formattedAddress ? `, ${place.formattedAddress}` : ""}</li>)}</ul>
        </Card>
      );
    case "route":
      return (
        <Card className="gap-1 p-4">
          <CardTitle className="flex items-center gap-2"><Route aria-hidden className="size-4" />Route to {card.destination.name}</CardTitle>
          <p className="text-sm text-muted-foreground">From {card.origin.name}</p>
          <p className="text-sm">{modes[card.travelMode]} · {distance(card.distanceMeters)} · {duration(card.durationSeconds)}</p>
          {card.warnings.map((warning) => <p key={warning} className="text-sm text-warn">{warning}</p>)}
        </Card>
      );
    case "handoff":
      return <Card className="gap-1 p-4"><CardTitle>{card.handoffKind === "share" ? `Location link for ${card.place.name}` : `Directions to ${card.place.name}`}</CardTitle>{card.place.formattedAddress && <p className="text-sm text-muted-foreground">{card.place.formattedAddress}</p>}<p className="font-mono text-xs break-all text-muted-foreground">{card.webUri}</p></Card>;
    case "locate":
      return (
        <Card className="gap-1 p-4">
          <CardTitle>{card.intent === "route-origin" && card.destination ? `Directions to ${card.destination.name}` : card.query ? `“${card.query}” near you` : "Location needed"}</CardTitle>
          <p className="text-sm text-muted-foreground">{card.intent === "route-origin" ? "Map plans the route from this phone · Location not shared with chat" : "Map searches around this phone · Location not shared with chat"}</p>
        </Card>
      );
  }
}

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
export function ReplyText({ segments, onChoose, onOpenRun }: ReplyTextProps) {
  return (
    <div className="flex flex-col gap-2">
      {blocksOf(segments).map((block, at) => {
        if (block.kind === "text") return <p key={at} className="font-legible whitespace-pre-wrap">{block.lines.join("\n").trim()}</p>;
        if (block.kind === "code") return <pre key={at} className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs"><code>{block.lines.filter((line) => !/^[ \t]{0,3}(`{3,}|~{3,})/.test(line)).join("\n")}</code></pre>;
        const { payload } = block.segment;
        if (payload.kind === "maps") return <MapsCardView key={at} card={payload.card} />;
        if (payload.kind === "workflow") return <Button key={at} variant="outline" aria-label={`Open workflow run ${payload.run.title}`} onClick={() => onOpenRun?.(payload.run.workflowId, payload.run.runId)}><Workflow aria-hidden className="size-4" />{payload.run.title}</Button>;
        if (payload.kind === "choice") return <div key={at} className="flex gap-2">{payload.options.map((option) => <Button key={option.value} variant="secondary" onClick={() => onChoose?.(option.value)}>{option.label}</Button>)}</div>;
        return null;
      })}
    </div>
  );
}
