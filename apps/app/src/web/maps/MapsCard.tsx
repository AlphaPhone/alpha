// spec/maps/cards.md, "A card's Map button runs one flow, chosen from what the card carries"; spec/maps/cards.md, "Only the newest agent message offers its choice and its card, in the session and conversation that showed them"
import type { MapsCard as Card } from "@elizaos/plugin-maps-client";
import { Map as MapIcon, MapPin, Navigation, Route as RouteIcon } from "lucide-react";
import { guidanceDistance, guidanceDuration } from "../../maps/geometry.vibe";
import { Button } from "../components/ui/index.ts";

const MODE: Record<string, string> = { drive: "Drive", walk: "Walk", bicycle: "Bike", transit: "Transit" };

/** A chat card, whether its message is still the newest, and its Map button. */
export type MapsCardProps = {
  card: Card;
  /** The message is still the newest of its session and conversation, so its Map button is live. */
  live: boolean;
  onOpenMap: () => void;
};

function title(card: Card): string {
  switch (card.kind) {
    case "place": return card.place.name;
    case "places": return card.near ? `“${card.query}” near ${card.near.name}` : `Places for “${card.query}”`;
    case "route": return `Route to ${card.destination.name}`;
    case "handoff": return card.handoffKind === "share" ? `Location link for ${card.place.name}` : `Directions to ${card.place.name}`;
    case "locate":
      if (card.intent === "route-origin" && card.destination) return `Directions to ${card.destination.name}`;
      if (card.query) return card.intent === "route-origin" ? `Directions to ${card.query}` : `“${card.query}” near you`;
      return "Location needed";
  }
}

function lines(card: Card): string[] {
  switch (card.kind) {
    case "place": return card.place.formattedAddress ? [card.place.formattedAddress] : [];
    case "places": return card.places.map((p) => p.formattedAddress ? `${p.name} · ${p.formattedAddress}` : p.name);
    case "route": return [`From ${card.origin.name}`, `${MODE[card.travelMode]} · ${guidanceDistance(card.distanceMeters, "en-US")} · ${guidanceDuration(card.durationSeconds)}`, ...card.warnings];
    case "handoff": return [card.webUri];
    case "locate": return [card.intent === "route-origin" ? "Map plans the route from this phone · Location not shared with chat" : "Map searches around this phone · Location not shared with chat"];
  }
}

/**
 * A Maps card in chat: what the agent found, the provider's attribution, and one Map button; links are shown as text, never opened.
 * @model spec/maps/cards.md
 * @design design.md
 */
export function MapsCard({ card, live, onOpenMap }: MapsCardProps) {
  const Icon = card.kind === "route" ? RouteIcon : card.kind === "locate" || card.kind === "handoff" ? Navigation : MapPin;
  const attribution = "attribution" in card ? card.attribution : null;
  return (
    <article aria-label={title(card)} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <header className="flex items-center gap-2">
        <Icon aria-hidden className="size-5 text-primary" />
        <h3 className="flex-1 truncate font-sans font-medium">{title(card)}</h3>
      </header>
      {lines(card).map((line, index) => <p key={index} className="break-words text-sm text-muted-foreground">{line}</p>)}
      {attribution && <p className="text-xs text-muted-foreground">{attribution}</p>}
      <Button variant="secondary" size="sm" disabled={!live} onClick={onOpenMap}><MapIcon aria-hidden />Map</Button>
    </article>
  );
}
