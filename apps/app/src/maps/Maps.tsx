// spec/app/maps/index.md, "Story: Move between the screen's modes"; spec/app/maps/index.md, "Story: Search for a place"; spec/app/maps/index.md, "Story: Look at a place"; spec/app/maps/index.md, "Story: Get directions"; spec/app/maps/index.md, "Story: Navigate"; spec/app/maps/index.md, "Story: Use my location"; spec/app/maps/index.md, "Story: Let the agent help with Maps"; spec/app/maps/credits.md, "Story: See the map for what I am looking at"
import { Alert, Banner, Button, Input, ListGroup, ListRow, type MapCamera, type MapStyle, MapView, SearchField, Spinner } from "@repo/ui";
import { ArrowUpDown, ChevronDown, ChevronUp, Copy, Crosshair, Info, Link, LocateFixed, Mail, MapPin, Navigation, Phone, Share2, Star } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import type { Resident, Shown } from "../runtime/area.tsx";
import { untimed } from "../runtime/reactor.vibe";
import { useMachine as useScreen } from "../../gen/app__maps.react.ts";
import { followsThePhone, googleShown, mode, panPixels, saysOutsideCoverage } from "../../gen/app__maps.ts";
import type { CopyNotice, GuideNotice, Maps as State, SavedNotice } from "../../gen/app__maps.ts";
import type { Machine as ScreenMachine } from "../../gen/app__maps.effect.vibe";
import { useMachine as useCredits } from "../../gen/app__maps__credits.react.ts";
import { breaksThePlane, cameraAim, compassShown, fitPadding, followZoom, northUpAfterGuidance, placeZoom, resultsMaxZoom, routeMaxZoom } from "../../gen/app__maps__credits.ts";
import type { Machine as CreditsMachine } from "../../gen/app__maps__credits.effect.vibe";
import { badgeOnly, holding } from "../../gen/app__maps__connection.ts";
import type { Wait } from "../../gen/app__maps__connection.ts";
import { offers } from "../../gen/app__maps__navigation.ts";
import type { Travel } from "../../gen/app__maps__navigation.ts";
import { hasRoom } from "../../gen/app__maps__places.ts";
import { type Seen, type Spot, atlas } from "./atlas.vibe";
import { degreesOf, pointIn } from "./geometry.ts";
import googleMaps from "./google-maps-attribution.svg";
import { coverageOf, settled, tile } from "./maps.vibe";

const ways: ReadonlyArray<{ travel: Travel; label: string }> = [
  { travel: "Drive", label: "Drive" }, { travel: "Transit", label: "Transit" }, { travel: "Walk", label: "Walk" }, { travel: "Bicycle", label: "Bike" },
];

/** The open map drawn where no provider is working, and outside the provider's coverage. */
const worldStyle = "https://tiles.openfreemap.org/styles/bright";

const notices: Record<SavedNotice, string> = {
  NoNotice: "",
  PlaceSaved: "Place saved on this device.",
  PlaceRenamed: "Saved place renamed.",
  PlaceRemoved: "Place removed from saved.",
  NotKept: "Saved places could not be changed.",
};

const told: Record<GuideNotice, string> = {
  Quiet: "",
  StoppedFromNotification: "Navigation stopped from the notification.",
  PausedAway: "Navigation paused while the app is in the background. Tap Start to resume.",
  AccountChanged: "The Maps account changed. Navigation ended.",
  RerouteKept: "Rerouting needs a precise, up-to-date location. The current route was kept.",
};

// spec/app/maps/connection.md, "A wait Cloud names holds every Maps request back until it ends: a rate limit for at most a day, a spent allowance for at most 400 days, and any other wait one minute"
/** What the owner reads while Cloud's wait holds Maps: Alpha's sentence around Cloud's number. */
function waitText(wait: Wait, seconds: number): string {
  if (wait === "AllowanceSpent") {
    const days = Math.max(1, Math.ceil(seconds / 86_400));
    return `You have used your Maps allowance for this period. It resets in ${days} ${days === 1 ? "day" : "days"}.`;
  }
  if (wait === "RateLimited") {
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    return `Maps request limit reached. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`;
  }
  return "Maps request limit reached. Try again later.";
}

// spec/app/maps/index.md, "The card shares the place or the arrival time, opens its website, or opens it in the phone's maps app"
/** The line under a place's name: its provider's most specific category, or what kind of place of the phone it is, or none. */
function subtitleOf(spot: Spot, saved: boolean): string | undefined {
  if (saved) return "Saved on this device";
  if (spot.category !== "") return spot.category;
  if (spot.providerId === "" && spot.id === "") return "Selected location";
  return undefined;
}

const copies: Record<CopyNotice, string> = { Uncopied: "", NumberCopied: "Number copied", CopyFailed: "Couldn't copy" };

/** The recent search `typed` is, in any case, or `typed` itself. */
const recentOf = (recent: readonly string[], typed: string) => recent.find((query) => query.toLowerCase() === typed.toLowerCase()) ?? typed;

const minutes = (seconds: number) => `${Math.max(1, Math.round(seconds / 60))} min`;
const distance = (meters: number) => (meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`);

// spec/app/maps/credits.md, "The camera goes to what the owner picked, on every map"
/** Where the camera goes for `state`, named so the map applies each aim once. */
function cameraOf(state: State, seen: Seen, following: boolean): MapCamera {
  const way = atlas.way(state.trip.route, state.chosen);
  const spot = atlas.spot(state.place);
  const results = state.place === 0 && state.search.status === "Loaded" ? seen.results.slice(0, state.results) : [];
  const aim = cameraAim(following, way !== undefined, true, spot !== undefined, true, true, results.length);
  if (aim === "FollowPhone" && seen.here !== undefined) return { kind: "follow", key: `here:${seen.here.at.lat}:${seen.here.at.lng}`, at: degreesOf(seen.here.at) };
  if (aim === "FitRoute" && way !== undefined) return { kind: "fit", key: `route:${state.trip.route}`, points: way.line.map(degreesOf), maxZoom: routeMaxZoom };
  if (aim === "CenterOnPlace" && spot !== undefined) return { kind: "centre", key: `place:${state.place}`, at: degreesOf(spot.at), zoom: placeZoom };
  if (aim === "FitResults") {
    const points = results.flatMap((place) => atlas.spot(place)?.at ?? []).map(degreesOf);
    return { kind: "fit", key: `results:${state.search.ticket}`, points, maxZoom: resultsMaxZoom };
  }
  if (aim === "KeepCamera" && way === undefined && spot === undefined && seen.here !== undefined && seen.showings > 0) {
    return { kind: "centre", key: `me:${seen.showings}`, at: degreesOf(seen.here.at), zoom: placeZoom };
  }
  return northUpAfterGuidance(state.trip.journey > 0, following) ? { kind: "northUp", key: `north:${state.trip.journey}` } : { kind: "keep" };
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
  const way = atlas.way(state.trip.route, state.chosen);
  const alternatives = seen.ways.get(state.trip.route) ?? [];
  const coverage = coverageOf(state);
  const tiles = coverage?.available ? coverage.tiles : undefined;
  const saved = state.saved.flatMap((entry) => {
    const found = atlas.spot(entry.place);
    return found === undefined ? [] : [{ ...entry, spot: found }];
  });
  const kept = saved.find((entry) => entry.place === state.place);
  const following = followsThePhone(state) && seen.here !== undefined;
  // spec/app/maps/connection.md, "Google's content is drawn only on Google's own map, whose only credit is the Google Maps badge"
  const googleMissing = state.link.google && tiles === undefined;
  const style: MapStyle = state.link.basemap === "Cloud" && tiles !== undefined
    ? { kind: "raster", tileSize: tiles.tileSize, minZoom: tiles.minZoom, maxZoom: tiles.maxZoom, tile: (z, x, y, signal) => runtime.runPromise(tile(z, x, y, signal)) }
    : { kind: "vector", url: worldStyle };
  const mapHeight = state.sheet === "Full" ? "h-40" : state.sheet === "Half" ? "h-72" : "h-96";
  const lower = state.sheet === "Full" ? "Half" : "Peek";
  const raise = state.sheet === "Peek" ? "Half" : "Full";
  const shownPins = now === "Search" ? seen.results.slice(0, state.results) : state.place !== 0 ? [state.place] : [];
  const pins = shownPins.flatMap((place) => {
    const found = atlas.spot(place);
    return found === undefined ? [] : [{ key: String(place), label: found.name, chosen: place === state.place, at: degreesOf(found.at) }];
  });
  const pick = (key: string) => {
    const place = Number(key);
    if (can({ type: "pickResult", place })) void send({ type: "pickResult", place });
  };
  const lift = () => { if (can({ type: "liftPress" })) void send({ type: "liftPress" }); };
  const submit = () => {
    const at = pointIn(typed);
    if (at !== undefined && can({ type: "pinAt", lat: at.lat, lng: at.lng })) return void send({ type: "pinAt", lat: at.lat, lng: at.lng });
    const query = recentOf(state.recent, typed.trim());
    if (can({ type: "search", query })) void send({ type: "search", query });
  };
  const typing = (text: string) => {
    setTyped(text);
    const query = recentOf(state.recent, text.trim());
    if (can({ type: "typeQuery", query, now: untimed })) void send({ type: "typeQuery", query, now: untimed });
  };
  const startFrom = () => {
    if (can({ type: "findOrigin", query: start.trim() })) void send({ type: "findOrigin", query: start.trim() });
  };
  const starts = state.originsFound > 0 ? seen.origins.slice(0, state.originsFound).flatMap((place) => {
    const found = atlas.spot(place);
    return found === undefined || place === state.place ? [] : [{ place, name: found.name, spot: found }];
  }) : [];
  const turn = way?.turns[state.trip.turn];
  const after = way?.turns[state.trip.turn + 1];
  const ahead = way?.turns.slice(state.trip.turn) ?? [];
  const room = hasRoom(state.saved, state.place);
  const inside = spot === undefined || !coverage?.available
    || coverage.regions.some(({ bounds: [west, south, east, north] }) => {
      const at = degreesOf(spot.at);
      return at.lng >= west && at.lng <= east && at.lat >= south && at.lat <= north;
    });
  return (
    <section aria-label="Maps" className="flex flex-col gap-3 p-4">
      {state.link.coverage.status === "Failed" && !holding(state.link) && (
        <Banner variant="warn" action={can({ type: "connect" }) && <Button size="sm" variant="outline" onClick={() => void send({ type: "connect" })}>Retry</Button>}>
          Maps could not be reached.
        </Banner>
      )}
      {holding(state.link) && <Alert variant="warn">{waitText(state.link.wait, state.link.held)}</Alert>}
      {state.link.unoffered && <Alert variant="info">Maps unavailable</Alert>}
      {state.link.known && state.link.account === 0 && <Alert variant="info">Sign in to Alpha Cloud to use Maps.</Alert>}

      {now === "Navigating" && (
        <Banner variant={state.trip.rerouting ? "warn" : "info"} action={(
          <div className="flex gap-1">
            {can({ type: "recenter" }) && <Button size="sm" variant="outline" onClick={() => void send({ type: "recenter" })}><LocateFixed />Recenter</Button>}
            {can({ type: "endGuidance" }) && <Button size="sm" variant="outline" onClick={() => void send({ type: "endGuidance" })}>End</Button>}
          </div>
        )}>
          {state.trip.guidance === "Arrived" ? `Arrived at ${kept?.name ?? spot?.name ?? "your destination"}.` : seen.here === undefined ? "Waiting for your location." : state.imprecise || seen.here.approximate ? "Turn guidance needs a precise, up-to-date location." : state.trip.rerouting ? "Finding a new route" : turn === undefined ? "" : `${turn.instruction}${after === undefined ? "" : `, then ${after.instruction}`}`}
        </Banner>
      )}

      {(now === "Browse" || now === "Search") && (
        <form onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <SearchField
            aria-label="Search Maps"
            placeholder="Search Maps"
            maxLength={300}
            value={typed}
            onFocus={() => { if (can({ type: "openSearch" })) void send({ type: "openSearch" }); }}
            onValueChange={typing}
          />
        </form>
      )}

      {googleMissing ? <Alert variant="warn" role="img" aria-label="Map">The Google map is missing.</Alert> : <MapView
        className={mapHeight}
        followZoom={followZoom}
        fitPadding={fitPadding}
        label={spot === undefined ? "Map" : `Map of ${spot.name}`}
        surface={state.link.plane}
        style={style}
        pins={pins}
        here={seen.here === undefined ? undefined : degreesOf(seen.here.at)}
        line={way?.line.map(degreesOf)}
        camera={cameraOf(state, seen, following)}
        compass={(bearing, pitch) => compassShown(bearing, pitch, following)}
        onReady={(plane) => { if (can({ type: "reportMap", plane, ok: true })) void send({ type: "reportMap", plane, ok: true }); }}
        onTrouble={(plane, trouble) => {
          if (breaksThePlane(trouble.styleLoaded, trouble.tileError, trouble.cancelled) && can({ type: "reportMap", plane, ok: false })) void send({ type: "reportMap", plane, ok: false });
        }}
        onPin={pick}
        onPress={(at) => {
          const event = { type: "pressMap", lat: Math.round(at.lat * 1e6), lng: Math.round(at.lng * 1e6), now: untimed } as const;
          if (can(event)) void send(event);
        }}
        onPressMove={(pixels) => { if (pixels > panPixels) lift(); }}
        onPressEnd={lift}
        onMenu={(at) => {
          const event = { type: "menuPin", lat: Math.round(at.lat * 1e6), lng: Math.round(at.lng * 1e6) } as const;
          if (can(event)) void send(event);
        }}
        onSettled={(view) => void runtime.runPromise(settled(view))}
        onDragged={() => { if (can({ type: "panMap" })) void send({ type: "panMap" }); }}
      >
        <div className="absolute right-2 bottom-2 flex flex-col gap-1">
          {can({ type: "useMyLocation" }) && <Button size="icon" variant="outline" aria-label="My location" onClick={() => void send({ type: "useMyLocation" })}><Crosshair /></Button>}
        </div>
        <div className="absolute bottom-2 left-2">
          {credits.can({ type: "openInfo" }) && (badgeOnly(state.link)
            ? <button type="button" aria-label="Google Maps" onClick={() => void credits.send({ type: "openInfo" })}><img src={googleMaps} alt="Google Maps" width={98} height={18} /></button>
            : <Button size="icon" variant="outline" aria-label="Map credits" onClick={() => void credits.send({ type: "openInfo" })}><Info /></Button>)}
        </div>
      </MapView>}
      {(can({ type: "resize", sheet: raise }) || can({ type: "resize", sheet: lower })) && (
        <div role="group" aria-label="Sheet" className="flex justify-center gap-2">
          {can({ type: "resize", sheet: raise }) && <Button size="sm" variant="ghost" aria-label="Raise the sheet" onClick={() => void send({ type: "resize", sheet: raise })}><ChevronUp /></Button>}
          {can({ type: "resize", sheet: lower }) && <Button size="sm" variant="ghost" aria-label="Lower the sheet" onClick={() => void send({ type: "resize", sheet: lower })}><ChevronDown /></Button>}
        </div>
      )}
      {can({ type: "retryMap" }) && (
        <Banner variant="warn" action={<Button size="sm" variant="outline" onClick={() => void send({ type: "retryMap" })}>Retry</Button>}>The map could not be drawn.</Banner>
      )}
      {credits.state.infoOpen && (
        <Alert variant="info" role="dialog" aria-label="Map credits">
          {credits.state.copyrightShown ? <p>{credits.state.copyright}</p> : coverage?.available ? <p>{coverage.attribution}</p> : (
            <p>
              {"Map data © "}<a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>
              {", "}<a className="underline" href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a>
            </p>
          )}
          {coverage?.available && (
            <p>{`Searches and route points go to ${coverage.disclosure.recipients.map((r) => `${r.name} (${r.operator})`).join(", ")} through Alpha Cloud, which keeps only the kind of each request and its result.`}</p>
          )}
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
          {state.search.status === "Failed" && !holding(state.link) && <Alert variant="warn">The search failed.</Alert>}
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
                  <button type="button" aria-label={query} disabled={!can({ type: "search", query })} onClick={() => { if (!can({ type: "search", query })) return; setTyped(query); void send({ type: "search", query }); }} />
                </ListRow>
              ))}
              {can({ type: "clearRecent" }) && <Button size="sm" variant="ghost" onClick={() => void send({ type: "clearRecent" })}>Clear</Button>}
            </ListGroup>
          )}
        </>
      )}

      {!state.keepable && <Alert variant="warn">Saved places could not be read. Existing data has not been replaced.</Alert>}
      {state.notice !== "NoNotice" && <p role="status" className="text-sm text-muted-foreground">{notices[state.notice]}</p>}
      {state.copyNotice !== "Uncopied" && <p role="status" className="text-sm text-muted-foreground">{copies[state.copyNotice]}</p>}
      {state.guideNotice !== "Quiet" && <Alert variant="info">{told[state.guideNotice]}</Alert>}
      {state.missedFix && <p role="status" className="text-sm text-muted-foreground">No location fix arrived.</p>}

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
          {subtitleOf(spot, kept !== undefined) !== undefined && <p className="text-muted-foreground">{subtitleOf(spot, kept !== undefined)}</p>}
          {spot.address !== undefined && <p>{spot.address}</p>}
          {spot.hours !== undefined && <p>{spot.hours}</p>}
          {coverage?.available && saysOutsideCoverage(state, inside) && <p className="text-sm text-muted-foreground">{`This location is outside ${coverage.sources.data} coverage.`}</p>}
          <div className="flex flex-wrap gap-2">
            {can({ type: "openDirections" }) && <Button onClick={() => void send({ type: "openDirections" })}><Navigation />Directions</Button>}
            {can({ type: "handOn", kind: "SharePlace" }) && <Button variant="outline" onClick={() => void send({ type: "handOn", kind: "SharePlace" })}><Share2 />Share</Button>}
            {can({ type: "handOn", kind: "EmailPlace" }) && <Button variant="outline" onClick={() => void send({ type: "handOn", kind: "EmailPlace" })}><Mail />Email</Button>}
            {can({ type: "handOn", kind: "CopyLink" }) && <Button variant="outline" onClick={() => void send({ type: "handOn", kind: "CopyLink" })}><Link />Copy link</Button>}
            {spot.website !== undefined && can({ type: "handOn", kind: "Website" }) && <Button variant="outline" onClick={() => void send({ type: "handOn", kind: "Website" })}>Website</Button>}
            {can({ type: "handOn", kind: "MapsApp" }) && <Button variant="outline" onClick={() => void send({ type: "handOn", kind: "MapsApp" })}>Open in another app</Button>}
            {spot.phone !== undefined && can({ type: "handOn", kind: "Call" }) && <Button variant="outline" onClick={() => void send({ type: "handOn", kind: "Call" })}><Phone />Call</Button>}
            {spot.phone !== undefined && can({ type: "handOn", kind: "CopyNumber" }) && <Button variant="outline" onClick={() => void send({ type: "handOn", kind: "CopyNumber" })}><Copy />Copy number</Button>}
            {can({ type: "forgetPlace" }) && <Button variant="outline" onClick={() => void send({ type: "forgetPlace" })}>Remove from saved</Button>}
            {can({ type: "returnToEvent" }) && <Button variant="ghost" onClick={() => void send({ type: "returnToEvent" })}>Back to event</Button>}
          </div>
          {can({ type: "namePlace", name: name.trim() || spot.name }) && (
            <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void send({ type: "namePlace", name: name.trim() || spot.name }); setName(""); }}>
              <Input aria-label="Name" placeholder={kept?.name ?? spot.name} maxLength={300} value={name} onChange={(event) => setName(event.target.value)} />
              <Button type="submit" variant="outline"><Star />{kept === undefined ? "Save" : "Rename"}</Button>
            </form>
          )}
          {!room && !googleShown(state) && <p className="text-sm text-muted-foreground">Saved places are full. Remove one before adding another.</p>}
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
              {can({ type: "findOrigin", query: "start" }) && (
                <form onSubmit={(event) => { event.preventDefault(); startFrom(); }}>
                  <Input aria-label="Starting point" maxLength={300} placeholder="Place"
                    value={start} onChange={(event) => setStart(event.target.value)} />
                </form>
              )}
              {state.origins.status === "Loading" && <Spinner label="Finding the starting point" />}
              {state.origins.status === "Loaded" && state.originsFound === 0 && <p className="text-sm text-muted-foreground">No starting point found.</p>}
              {[...starts, ...saved.filter((entry) => entry.place !== state.place && !starts.some((found) => found.place === entry.place))].map((entry) => (
                can({ type: "startFrom", place: entry.place, lat: entry.spot.at.lat, lng: entry.spot.at.lng }) && (
                  <Button key={entry.place} size="sm" variant="ghost" onClick={() => void send({ type: "startFrom", place: entry.place, lat: entry.spot.at.lat, lng: entry.spot.at.lng })}>{`From ${entry.name}`}</Button>
                )
              ))}
              {spot !== undefined && can({ type: "swapEnds", lat: spot.at.lat, lng: spot.at.lng }) && (
                <Button size="sm" variant="outline" onClick={() => void send({ type: "swapEnds", lat: spot.at.lat, lng: spot.at.lng })}><ArrowUpDown />Swap ends</Button>
              )}
            </>
          )}
          {state.trip.plan.status === "Loading" && <Spinner label="Planning the route" />}
          {state.trip.plan.status === "Failed" && !holding(state.link) && <Alert variant="warn">No route was found.</Alert>}
          {now === "Directions" && alternatives.length > 1 ? (
            <div role="group" aria-label="Routes" className="flex flex-col gap-1">
              {alternatives.map((option, index) => (
                <Button key={index} variant={index === state.chosen ? "primary" : "outline"} aria-pressed={index === state.chosen}
                  disabled={!can({ type: "chooseRoute", index, turns: Math.max(1, option.turns.length) })}
                  onClick={() => void send({ type: "chooseRoute", index, turns: Math.max(1, option.turns.length) })}>
                  {`${index === 0 ? "Recommended" : `Alternative ${index}`}: ${minutes(option.seconds)}, ${distance(option.meters)}`}
                </Button>
              ))}
            </div>
          ) : way !== undefined && <p>{`${minutes(way.seconds)}, ${distance(way.meters)}`}</p>}
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
