// spec/maps/screen.md, "Directions open for a place with verified details, with a mode the provider offers"; spec/maps/screen.md, "A starting point is the phone's position, coordinates, a saved place or a provider candidate"; spec/maps/screen.md, "The provider's routes are listed in order and choosing one sends no new request"; spec/maps/screen.md, "Swapping ends keeps each end's identity and plans the reverse route"
import { ArrowDownUp, Bike, Bus, Car, Footprints, LocateFixed, Share2, X } from "lucide-react";
import type { Phase } from "../../../gen/maps__screen.ts";
import type { SavedItem } from "../../../gen/maps__savedPlaces.ts";
import type { Travel } from "../../../gen/maps__vocabulary.ts";
import { guidanceDistance, guidanceDuration } from "../../maps/geometry.vibe";
import type { Place, Route } from "../../maps/maps.schema.vibe";
import { Button, Input, ListRow, ScrollArea, Skeleton } from "../components/ui/index.ts";
import { cn } from "../lib/cn.ts";
import { ManeuverIcon } from "./ManeuverIcon.tsx";

const MODES: ReadonlyArray<{ travel: Travel; label: string; Icon: typeof Car }> = [
  { travel: "Drive", label: "Drive", Icon: Car }, { travel: "Transit", label: "Transit", Icon: Bus },
  { travel: "Walk", label: "Walk", Icon: Footprints }, { travel: "Bicycle", label: "Bike", Icon: Bike },
];

/** The destination, the starting point and its candidates, the travel modes, the provider's routes and Start. */
export type DirectionsSheetProps = {
  destination: string;
  originText: string;
  travel: Travel;
  /** Which modes the provider offers; an unoffered one is shown and explains itself when tapped. */
  offered: (travel: Travel) => boolean;
  route: Phase;
  routes: ReadonlyArray<Route>;
  chosen: number;
  /** The origin candidates while choosing a starting point. */
  choosing: boolean;
  candidates: ReadonlyArray<Place>;
  savedMatches: ReadonlyArray<SavedItem>;
  /** Swap is on the sheet: a starting point is set and none is being chosen. */
  swapShown: boolean;
  /** Swap can run now: the route is planned. */
  canSwap: boolean;
  canStart: boolean;
  /** Google content is shown, so the route may not be shared. */
  restricted: boolean;
  onOriginText: (text: string) => void;
  onSubmitOrigin: () => void;
  onUseLocation: () => void;
  onTravel: (travel: Travel) => void;
  onChooseRoute: (index: number) => void;
  onChooseCandidate: (index: number) => void;
  onChooseSaved: (id: number) => void;
  onSwap: () => void;
  onStart: () => void;
  onShare: () => void;
  onClose: () => void;
};

/**
 * Directions to the shown place: the starting point, the travel mode, the provider's routes and their steps, and Start.
 * @model spec/maps/screen.md
 * @design design.md
 */
export function DirectionsSheet(p: DirectionsSheetProps) {
  const route = p.route === "Ready" ? p.routes[p.chosen] : undefined;
  return (
    <section aria-label={`Directions to ${p.destination}`} className="flex flex-col gap-3 p-4">
      <header className="flex items-center gap-2">
        <h2 className="flex-1 truncate font-display text-2xl">{p.destination}</h2>
        <Button variant="ghost" size="icon" aria-label="Close directions" onClick={p.onClose}><X aria-hidden /></Button>
      </header>
      <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); p.onSubmitOrigin(); }}>
        <Input aria-label="Starting point" placeholder="My location" value={p.originText} enterKeyHint="go" onChange={(e) => p.onOriginText(e.target.value)} />
        <Button variant="ghost" size="icon" aria-label="Use my location" onClick={p.onUseLocation}><LocateFixed aria-hidden /></Button>
        {p.swapShown && (
          <Button variant="ghost" size="icon" aria-label="Swap start and destination" aria-disabled={!p.canSwap || undefined}
            className={cn(!p.canSwap && "opacity-50")} onClick={() => { if (p.canSwap) p.onSwap(); }}><ArrowDownUp aria-hidden /></Button>
        )}
      </form>
      <div role="radiogroup" aria-label="Travel mode" className="flex gap-2">
        {MODES.map(({ travel, label, Icon }) => (
          <Button key={travel} role="radio" aria-checked={p.travel === travel} size="sm" variant={p.travel === travel ? "primary" : "secondary"}
            aria-disabled={!p.offered(travel) || undefined} className={cn(!p.offered(travel) && "opacity-50")} onClick={() => p.onTravel(travel)}>
            <Icon aria-hidden />{label}
          </Button>
        ))}
      </div>
      {p.choosing ? (
        <ul aria-label="Starting points">
          {p.savedMatches.map((item) => <li key={`s${item.id}`}><ListRow title={item.label} detail="Saved place" onClick={() => p.onChooseSaved(item.id)} /></li>)}
          {p.candidates.map((place, index) => <li key={place.id}><ListRow title={place.name} detail={place.address} onClick={() => p.onChooseCandidate(index)} /></li>)}
        </ul>
      ) : p.route === "Loading" ? <Skeleton aria-label="Planning" className="h-16" /> : route ? (
        <>
          {p.routes.length > 1 && (
            <div role="radiogroup" aria-label="Routes" className="flex flex-col gap-1">
              {p.routes.map((r, index) => (
                <ListRow key={r.id} role="radio" aria-checked={index === p.chosen} selected={index === p.chosen} onClick={() => p.onChooseRoute(index)}
                  title={guidanceDuration(r.durationSeconds)} detail={index === 0 ? "Recommended" : `Alternative ${index}`} trailing={guidanceDistance(r.distanceMeters, "en-US")} />
              ))}
            </div>
          )}
          <p className="flex items-baseline gap-2">
            <span className="font-display text-3xl tabular-nums">{guidanceDuration(route.durationSeconds)}</span>
            <span className="text-muted-foreground">{guidanceDistance(route.distanceMeters, "en-US")}{route.traffic === "live" ? "" : " · no live traffic"}</span>
          </p>
          <ScrollArea className="max-h-[30vh]">
            <ol aria-label="Steps">
              {route.steps.map((step, index) => (
                <li key={index} className="flex items-center gap-3 py-1">
                  <ManeuverIcon maneuver={step.maneuver} className="size-5 shrink-0" />
                  <span className="flex-1">{step.instruction}</span>
                  {step.distanceMeters > 0 && <span className="text-sm tabular-nums text-muted-foreground">{guidanceDistance(step.distanceMeters, "en-US")}</span>}
                </li>
              ))}
            </ol>
          </ScrollArea>
          {route.attribution && <p className="text-xs text-muted-foreground">{route.attribution}</p>}
        </>
      ) : null}
      <div className="flex gap-2">
        <Button className="flex-1" disabled={!p.canStart} onClick={p.onStart}>Start</Button>
        {!p.restricted && route && <Button variant="secondary" size="icon" aria-label="Share route" onClick={p.onShare}><Share2 aria-hidden /></Button>}
      </div>
    </section>
  );
}
