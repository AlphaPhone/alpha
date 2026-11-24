// spec/app/maps/index.md, "Story: Move between the screen's modes"; spec/app/maps/index.md, "Story: Search for a place"; spec/app/maps/index.md, "Story: Look at a place"; spec/app/maps/index.md, "Story: Get directions"; spec/app/maps/index.md, "Story: Navigate"; spec/app/maps/index.md, "Story: Use my location"; spec/app/maps/index.md, "Story: Let the agent help with Maps"
import { Alert, Banner, Button, Input, ListGroup, ListRow, MapView, SearchField, Spinner } from "@repo/ui";
import { Crosshair, Info, MapPin, Minus, Navigation, Plus, Share2, Star } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import type { Resident, Shown } from "../runtime/area.tsx";
import { useMachine as useScreen } from "../../gen/app__maps.react.ts";
import { googleShown, mode } from "../../gen/app__maps.ts";
import type { Machine as ScreenMachine } from "../../gen/app__maps.effect.vibe";
import { useMachine as useCredits } from "../../gen/app__maps__credits.react.ts";
import type { Machine as CreditsMachine } from "../../gen/app__maps__credits.effect.vibe";
import { badgeOnly } from "../../gen/app__maps__connection.ts";
import { offers } from "../../gen/app__maps__navigation.ts";
import type { Travel } from "../../gen/app__maps__navigation.ts";
import { type Spot, atlas } from "./atlas.vibe";
import { type Point, pixelOf, pointIn } from "./geometry.ts";
import { zoomed } from "./maps.vibe";

const ways: ReadonlyArray<{ travel: Travel; label: string }> = [
  { travel: "Drive", label: "Drive" }, { travel: "Transit", label: "Transit" }, { travel: "Walk", label: "Walk" }, { travel: "Bicycle", label: "Bike" },
];

const minutes = (seconds: number) => `${Math.max(1, Math.round(seconds / 60))} min`;
const distance = (meters: number) => (meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`);
const viewWidth = 360;
const viewHeight = 288;

/** A pin dropped where the owner typed coordinates, numbered as a place of the map. */
function pinAt(at: Point, text: string): number {
  return atlas.numberOf({ name: text.trim(), category: "Dropped pin", at, providerId: "", id: "", google: false });
}

/**
 * Maps: the map with its credits, the search and its results, a place's card, its directions and guidance along them,
 * the saved places and the agent's questions. Each control is offered exactly when its event is.
 * @model spec/app/maps/index.md
 */
export function Maps({ runtime }: Shown<ScreenMachine | CreditsMachine | Resident>) {
  const screen = useScreen(runtime);
  const credits = useCredits(runtime);
  const seen = useSyncExternalStore(atlas.subscribe, atlas.snapshot, atlas.snapshot);
  const [typed, setTyped] = useState("");
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const { state, can, send } = screen;
  if (screen.cause) return <Alert variant="destructive" className="m-4">Alpha could not open Maps</Alert>;
  if (!state || !credits.state) return null;
  const now = mode(state);
  const spot: Spot | undefined = atlas.spot(state.place);
  const way = state.trip.route === 0 ? undefined : seen.ways.get(state.trip.route);
  const saved = state.saved.flatMap((entry) => {
    const found = atlas.spot(entry.place);
    return found === undefined ? [] : [{ ...entry, spot: found }];
  });
  const kept = saved.find((entry) => entry.place === state.place);
  const centre = seen.tiles?.centre ?? spot?.at ?? seen.here?.at ?? { lat: 0, lng: 0 };
  const zoom = seen.tiles?.zoom ?? seen.zoom;
  const placed = (at: Point) => {
    const { x, y } = pixelOf(at, centre, zoom, viewWidth, viewHeight);
    return { x: x - viewWidth / 2, y: y - viewHeight / 2 };
  };
  const pins = now === "Search" ? seen.results.slice(0, state.results) : state.place !== 0 ? [state.place] : [];
  const markers = [
    ...pins.flatMap((place) => {
      const found = atlas.spot(place);
      return found === undefined ? [] : [{ key: String(place), label: found.name, chosen: place === state.place, ...placed(found.at) }];
    }),
    ...(seen.here === undefined ? [] : [{ key: "here", label: "Your location", here: true, ...placed(seen.here.at) }]),
  ];
  const submit = () => {
    const at = pointIn(typed);
    if (at !== undefined && can({ type: "dropPin", place: 1 })) return void send({ type: "dropPin", place: pinAt(at, typed) });
    if (can({ type: "search", query: typed.trim() })) void send({ type: "search", query: typed.trim() });
  };
  const startFrom = () => {
    const at = pointIn(start);
    if (at === undefined || !can({ type: "planFrom", origin: "Coordinates" })) return;
    atlas.startAt(at);
    void send({ type: "planFrom", origin: "Coordinates" });
  };
  const turn = way?.turns[state.trip.turn];
  const after = way?.turns[state.trip.turn + 1];
  const ahead = way?.turns.slice(state.trip.turn) ?? [];
  return (
    <section aria-label="Maps" className="flex flex-col gap-3 p-4">
      {state.link.coverage.status === "Failed" && (
        <Banner variant="warn" action={can({ type: "connect" }) && <Button size="sm" variant="outline" onClick={() => void send({ type: "connect" })}>Retry</Button>}>
          Maps could not be reached.
        </Banner>
      )}
      {state.link.account === 0 && <Alert variant="info">Sign in to Alpha Cloud to use Maps.</Alert>}

      {now === "Navigating" && (
        <Banner variant={state.trip.rerouting ? "warn" : "info"} action={can({ type: "endGuidance" }) && <Button size="sm" variant="outline" onClick={() => void send({ type: "endGuidance" })}>End</Button>}>
          {state.trip.guidance === "Arrived" ? "You have arrived." : state.trip.rerouting ? "Finding a new route" : turn === undefined ? "" : `${turn.instruction}${after === undefined ? "" : `, then ${after.instruction}`}`}
        </Banner>
      )}

      {(now === "Browse" || now === "Search") && (
        <form onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <SearchField
            aria-label="Search Maps"
            placeholder="Search Maps"
            value={typed}
            onFocus={() => { if (can({ type: "openSearch" })) void send({ type: "openSearch" }); }}
            onValueChange={setTyped}
          />
        </form>
      )}

      <MapView label={spot === undefined ? "Map" : `Map of ${spot.name}`} tiles={seen.tiles?.images ?? []} markers={markers} line={way?.line.map(placed)}>
        <div className="absolute right-2 bottom-2 flex flex-col gap-1">
          <Button size="icon" variant="outline" aria-label="Zoom in" onClick={() => void runtime.runPromise(zoomed(1))}><Plus /></Button>
          <Button size="icon" variant="outline" aria-label="Zoom out" onClick={() => void runtime.runPromise(zoomed(-1))}><Minus /></Button>
          {can({ type: "useMyLocation" }) && <Button size="icon" variant="outline" aria-label="My location" onClick={() => void send({ type: "useMyLocation" })}><Crosshair /></Button>}
        </div>
        <div className="absolute bottom-2 left-2">
          {credits.can({ type: "openInfo" }) && (badgeOnly(state.link)
            ? <Button size="sm" variant="outline" onClick={() => void credits.send({ type: "openInfo" })}>Google Maps</Button>
            : <Button size="icon" variant="outline" aria-label="Map credits" onClick={() => void credits.send({ type: "openInfo" })}><Info /></Button>)}
        </div>
      </MapView>
      {can({ type: "retryMap" }) && (
        <Banner variant="warn" action={<Button size="sm" variant="outline" onClick={() => void send({ type: "retryMap" })}>Retry</Button>}>The map could not be drawn.</Banner>
      )}
      {credits.state.infoOpen && (
        <Alert variant="info" role="dialog" aria-label="Map credits">
          <p>{credits.state.copyrightShown ? credits.state.copyright : state.link.google ? "Map data ©Google" : "Map data from the Maps provider"}</p>
          <p>Searches and route points go to the Maps provider through Alpha Cloud, which keeps only the kind of each request and its result.</p>
          <Button size="sm" variant="ghost" onClick={() => void credits.send({ type: "closeInfo" })}>Close</Button>
        </Alert>
      )}

      {can({ type: "continueDisclosure" }) && !can({ type: "useMyLocation" }) && (now === "Browse" || now === "Directions") && (
        <Alert variant="info" role="dialog" aria-label="Location">
          <p>Maps uses your location to show where you are and to plan routes from it. Searches and route points go to the Maps provider; your agent is never told where you are.</p>
          <Button size="sm" onClick={() => void send({ type: "continueDisclosure" })}>Continue</Button>
        </Alert>
      )}

      {now === "Search" && (
        <>
          {state.search.status === "Loading" && <Spinner label="Searching" />}
          {state.search.status === "Failed" && <Alert variant="warn">The search failed.</Alert>}
          {state.search.status === "Loaded" && state.results === 0 && <Alert variant="info">No places found.</Alert>}
          {state.results > 0 && (
            <ListGroup heading="Results">
              {seen.results.slice(0, state.results).map((place) => {
                const found = atlas.spot(place);
                return found && (
                  <ListRow key={place} asChild title={found.name} detail={found.category || found.address} leading={<MapPin />}>
                    <button type="button" aria-label={found.name} disabled={!can({ type: "pickResult", place })} onClick={() => void send({ type: "pickResult", place })} />
                  </ListRow>
                );
              })}
            </ListGroup>
          )}
          {state.query === "" && state.recent.length > 0 && (
            <ListGroup heading="Recent">
              {state.recent.map((query) => (
                <ListRow key={query} asChild title={query}>
                  <button type="button" aria-label={query} onClick={() => { setTyped(query); void send({ type: "search", query }); }} />
                </ListRow>
              ))}
            </ListGroup>
          )}
        </>
      )}

      {(now === "Browse" || now === "Search") && saved.length > 0 && (
        <ListGroup heading="Saved">
          {saved.map((entry) => (
            <ListRow key={entry.place} asChild title={entry.name} leading={<Star />}>
              <button type="button" aria-label={entry.name} disabled={!can({ type: "pickSaved", place: entry.place })} onClick={() => void send({ type: "pickSaved", place: entry.place })} />
            </ListRow>
          ))}
        </ListGroup>
      )}

      {now === "Place" && spot !== undefined && (
        <section aria-label={kept?.name ?? spot.name} className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{kept?.name ?? spot.name}</h2>
          <p className="text-muted-foreground">{spot.category || "Place"}</p>
          {spot.address !== undefined && <p>{spot.address}</p>}
          {spot.hours !== undefined && <p>{spot.hours}</p>}
          <div className="flex flex-wrap gap-2">
            {can({ type: "openDirections" }) && <Button onClick={() => void send({ type: "openDirections" })}><Navigation />Directions</Button>}
            {can({ type: "handOn", kind: "SharePlace" }) && <Button variant="outline" onClick={() => void send({ type: "handOn", kind: "SharePlace" })}><Share2 />Share</Button>}
            {spot.website !== undefined && can({ type: "handOn", kind: "Website" }) && <Button variant="outline" onClick={() => void send({ type: "handOn", kind: "Website" })}>Website</Button>}
            {can({ type: "handOn", kind: "MapsApp" }) && <Button variant="outline" onClick={() => void send({ type: "handOn", kind: "MapsApp" })}>Open in another app</Button>}
            {can({ type: "forgetPlace" }) && <Button variant="outline" onClick={() => void send({ type: "forgetPlace" })}>Remove from saved</Button>}
            {can({ type: "returnToEvent" }) && <Button variant="ghost" onClick={() => void send({ type: "returnToEvent" })}>Back to event</Button>}
          </div>
          {can({ type: "namePlace", name: name.trim() || spot.name }) && (
            <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void send({ type: "namePlace", name: name.trim() || spot.name }); setName(""); }}>
              <Input aria-label="Name" placeholder={kept?.name ?? spot.name} value={name} onChange={(event) => setName(event.target.value)} />
              <Button type="submit" variant="outline"><Star />{kept === undefined ? "Save" : "Rename"}</Button>
            </form>
          )}
          {googleShown(state) && <p className="text-xs text-muted-foreground">Google Maps</p>}
        </section>
      )}

      {(now === "Directions" || now === "Navigating") && spot !== undefined && (
        <section aria-label="Directions" className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{`To ${kept?.name ?? spot.name}`}</h2>
          {now === "Directions" && (
            <>
              <div role="group" aria-label="Travel mode" className="flex flex-wrap gap-2">
                {ways.filter(({ travel }) => offers(state.link.offer, travel)).map(({ travel, label }) => (
                  <Button key={travel} size="sm" variant={state.trip.travel === travel ? "primary" : "outline"} aria-pressed={state.trip.travel === travel}
                    disabled={!can({ type: "chooseTravel", travel })} onClick={() => void send({ type: "chooseTravel", travel })}>
                    {label}
                  </Button>
                ))}
              </div>
              {can({ type: "useMyLocation" }) && <Button variant="outline" onClick={() => void send({ type: "useMyLocation" })}><Crosshair />From my location</Button>}
              <form onSubmit={(event) => { event.preventDefault(); startFrom(); }}>
                <Input aria-label="Starting point" placeholder="Latitude, longitude" value={start} onChange={(event) => setStart(event.target.value)} />
              </form>
              {saved.filter((entry) => entry.place !== state.place).map((entry) => (
                can({ type: "planFrom", origin: "SomePlace" }) && (
                  <Button key={entry.place} size="sm" variant="ghost" onClick={() => { atlas.startAt(entry.spot.at); void send({ type: "planFrom", origin: "SomePlace" }); }}>{`From ${entry.name}`}</Button>
                )
              ))}
            </>
          )}
          {state.trip.plan.status === "Loading" && <Spinner label="Planning the route" />}
          {state.trip.plan.status === "Failed" && <Alert variant="warn">No route was found.</Alert>}
          {way !== undefined && <p>{`${minutes(way.seconds)}, ${distance(way.meters)}`}</p>}
          {now === "Navigating" && ahead.length > 0 && (
            <ListGroup heading="Next">
              {ahead.slice(0, 3).map((step, at) => <ListRow key={`${state.trip.turn + at}`} title={step.instruction} detail={distance(step.meters)} />)}
            </ListGroup>
          )}
          <div className="flex flex-wrap gap-2">
            {can({ type: "startGuidance" }) && <Button onClick={() => void send({ type: "startGuidance" })}><Navigation />Start</Button>}
            {can({ type: "handOn", kind: "EtaShare" }) && <Button variant="outline" onClick={() => void send({ type: "handOn", kind: "EtaShare" })}><Share2 />Share arrival</Button>}
          </div>
        </section>
      )}

      {state.question !== "NoQuestion" && state.review.showing && (
        <Alert variant="info" role="dialog" aria-label={state.question === "ReadPlace" ? "Share this place with your agent" : "Start this route"}>
          <p>{state.question === "ReadPlace" ? `Your agent asks to read ${spot?.name ?? "this place"}.` : `Your agent proposes this route to ${spot?.name ?? "this place"}.`}</p>
          <div className="flex gap-2">
            {can({ type: "approve" }) && <Button size="sm" onClick={() => void send({ type: "approve" })}>{state.question === "ReadPlace" ? "Share" : "Start"}</Button>}
            {can({ type: "decline" }) && <Button size="sm" variant="ghost" onClick={() => void send({ type: "decline" })}>Not now</Button>}
          </div>
        </Alert>
      )}
    </section>
  );
}
