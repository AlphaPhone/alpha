// spec/maps/screen.md, "A place opens from a result, a saved place, a pin, the phone's position or the agent"; spec/maps/screen.md, "Typing waits 350 milliseconds; Enter searches once for the text, and repeating it reuses the answer"
import { Bookmark, Clock, MapPin } from "lucide-react";
import type { Phase } from "../../../gen/maps__screen.ts";
import type { SavedItem } from "../../../gen/maps__savedPlaces.ts";
import { type Coordinate, type Place } from "../../maps/maps.schema.vibe";
import { coordinateLabel, greatCircle, guidanceDistance } from "../../maps/geometry.vibe";
import { Button, EmptyState, ListRow, ScrollArea, Skeleton } from "../components/ui/index.ts";

const CATEGORIES = [["Coffee", "coffee"], ["Food", "food"], ["Gas", "gas station"], ["Pharmacy", "pharmacy"], ["Groceries", "groceries"], ["Gym", "gym"]] as const;

/** The results of the run the screen holds, or with no query the saved places and recent searches. */
export type ResultsSheetProps = {
  /** The search phase of the run the results belong to. */
  phase: Phase;
  places: ReadonlyArray<Place>;
  saved: ReadonlyArray<SavedItem>;
  recent: ReadonlyArray<string>;
  /** The query has no text: show saved places, categories and recent searches. */
  emptyQuery: boolean;
  /** The phone's position, for distances; absent when no fix is ready. */
  here?: Coordinate;
  onPick: (index: number) => void;
  onSaved: (id: number) => void;
  onSearch: (text: string) => void;
  onClearRecent: () => void;
};

/** Search results, or with no query the saved places, category shortcuts and recent searches. */
export function ResultsSheet({ phase, places, saved, recent, emptyQuery, here, onPick, onSaved, onSearch, onClearRecent }: ResultsSheetProps) {
  if (emptyQuery) {
    return (
      <section aria-label="Saved and recent" className="flex flex-col gap-3 py-2">
        <div className="flex gap-2 overflow-x-auto px-4">
          {CATEGORIES.map(([label, query]) => <Button key={label} variant="secondary" size="sm" onClick={() => onSearch(query)}>{label}</Button>)}
        </div>
        {saved.map((item) => (
          <ListRow key={item.id} title={item.label} leading={<Bookmark aria-hidden />} onClick={() => onSaved(item.id)}
            detail={coordinateLabel({ latitude: item.lat / 1e6, longitude: item.lng / 1e6 })} />
        ))}
        {recent.length > 0 && (
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-4">
              <span className="font-mono text-xs uppercase text-muted-foreground">Recent</span>
              <Button variant="ghost" size="sm" onClick={onClearRecent}>Clear</Button>
            </div>
            {recent.map((text) => <ListRow key={text} title={text} leading={<Clock aria-hidden />} onClick={() => onSearch(text)} />)}
          </div>
        )}
      </section>
    );
  }
  if (phase === "Loading") return <div aria-busy="true" className="flex flex-col gap-2 p-4"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>;
  if (phase === "Empty" || (phase === "Ready" && places.length === 0)) return <EmptyState title="No results" icon={<MapPin aria-hidden />} />;
  return (
    <ScrollArea className="max-h-[50vh]">
      <ul aria-label="Results">
        {places.map((place, index) => (
          <li key={`${place.providerId}:${place.id}`}>
            <ListRow title={place.name} leading={<MapPin aria-hidden />} onClick={() => onPick(index)}
              detail={[here ? guidanceDistance(greatCircle(here, place.coordinate), "en-US") : "", place.address ?? coordinateLabel(place.coordinate)].filter(Boolean).join(" · ")} />
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}
