// spec/app/assistant/reply.md, "A recognized tool block outside a fence becomes its card; inside a fence every line stays code"; spec/app/maps/index.md, "The agent's search shows its cards in the conversation and leaves the screen alone"
import { recognizedMapsCards, withoutMapsCards, type MapsCard } from "@elizaos/plugin-maps-client";
import { AssistantPlaceCard } from "@repo/ui";

const modes: Readonly<Record<string, string>> = { drive: "Drive", walk: "Walk", bicycle: "Bike", transit: "Transit" };

function title(card: MapsCard): string {
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

function minutes(seconds: number): string {
  const total = Math.max(1, Math.round(seconds / 60));
  return total < 60 ? `${total} min` : `${Math.floor(total / 60)} h ${total % 60} min`;
}

function distance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function lines(card: MapsCard): string[] {
  switch (card.kind) {
    case "place": return card.place.formattedAddress ? [card.place.formattedAddress] : [];
    case "places": return card.places.map((place) => place.formattedAddress ? `${place.name} · ${place.formattedAddress}` : place.name);
    case "route": return [`From ${card.origin.name}`, `${modes[card.travelMode] ?? card.travelMode} · ${distance(card.distanceMeters)} · ${minutes(card.durationSeconds)}`, ...card.warnings];
    case "handoff": return [card.webUri];
    case "locate": return [card.intent === "route-origin" ? "Maps plans the route from this phone. Your location is not shared with the chat." : "Maps searches around this phone. Your location is not shared with the chat."];
  }
}

/** A reply's Maps cards, read with eliza's own recognizer, and its text without them. */
export function mapsCardsOf(text: string): { readonly text: string; readonly cards: readonly MapsCard[] } {
  const cards = recognizedMapsCards(text).map(({ card }) => card);
  return cards.length === 0 ? { text, cards } : { text: withoutMapsCards(text), cards };
}

/** One Maps card in the conversation: what the agent found and the provider's attribution; a link is shown as text, never opened. */
export function MapsCardView({ card, settled, onOpen }: { card: MapsCard; settled: boolean; onOpen?: () => void }) {
  const attribution = "attribution" in card ? card.attribution ?? undefined : undefined;
  return <AssistantPlaceCard title={title(card)} lines={lines(card)} attribution={attribution} settled={settled} onOpen={onOpen} />;
}
