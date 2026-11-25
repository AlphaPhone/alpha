// spec/app/maps/index.md, "Story: Move between the screen's modes"; spec/app/maps/index.md, "Story: Search for a place"; spec/app/maps/index.md, "Story: Look at a place"; spec/app/maps/index.md, "Story: Get directions"; spec/app/maps/index.md, "Story: Navigate"; spec/app/maps/index.md, "Story: Use my location"; spec/app/maps/index.md, "Story: Let the agent help with Maps"; spec/app/maps/credits.md, "Story: See the map for what I am looking at"
import { Alert, Banner, Button, cn, Input, type MapCamera, MapsChip, MapsPillButton, MapsPlaceRow, MapsRoundButton, MapsSearchBar, MapsSheet, MapsStatusCard, type MapStyle, MapView, Spinner } from "@repo/ui";
import { ArrowUpDown, Bike, Bus, Car, Check, ChevronLeft, Clock, Coffee, Dumbbell, ExternalLink, Footprints, Fuel, Globe, Info, LocateFixed, type LucideIcon, MapPin, Navigation, Phone, Search, Share2, ShoppingCart, SquarePlus, Star, Utensils, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import type { Resident, Shown } from "../runtime/area.tsx";
import { untimed } from "../runtime/reactor.vibe";
import { AppBack } from "../shell/AppBack.tsx";
import { useMachine as useScreen } from "../../gen/app__maps.react.ts";
import { followsThePhone, googleShown, mode, panPixels, saysOutsideCoverage } from "../../gen/app__maps.ts";
import type { CopyNotice, GuideNotice, Maps as State, SavedNotice, Sheet } from "../../gen/app__maps.ts";
import type { Machine as ScreenMachine } from "../../gen/app__maps.effect.vibe";
import { useMachine as useCredits } from "../../gen/app__maps__credits.react.ts";
import { breaksThePlane, cameraAim, compassShown, northUpAfterGuidance, placeZoom, resultsMaxZoom, routeMaxZoom } from "../../gen/app__maps__credits.ts";
import type { Machine as CreditsMachine } from "../../gen/app__maps__credits.effect.vibe";
import { badgeOnly, holding } from "../../gen/app__maps__connection.ts";
import { offers } from "../../gen/app__maps__navigation.ts";
import type { Travel } from "../../gen/app__maps__navigation.ts";
import { hasRoom } from "../../gen/app__maps__places.ts";
import { type Coverage, type Seen, type Spot, type Way, atlas } from "./atlas.vibe";
import { degreesOf, pointIn } from "./geometry.ts";
import googleMaps from "./google-maps-attribution.svg";
import { coverageOf, settled, tile } from "./maps.vibe";

const ways: ReadonlyArray<{ travel: Travel; label: string; icon: LucideIcon }> = [
  { travel: "Drive", label: "Drive", icon: Car }, { travel: "Transit", label: "Transit", icon: Bus }, { travel: "Walk", label: "Walk", icon: Footprints }, { travel: "Bicycle", label: "Bike", icon: Bike },
];

/** The kinds of place the search sheet offers before anything is typed, each searched for by its words. */
const kindsOfPlace: ReadonlyArray<{ label: string; query: string; icon: LucideIcon }> = [
  { label: "Coffee", query: "coffee", icon: Coffee }, { label: "Food", query: "food", icon: Utensils }, { label: "Gas", query: "gas station", icon: Fuel },
  { label: "Pharmacy", query: "pharmacy", icon: SquarePlus }, { label: "Groceries", query: "groceries", icon: ShoppingCart }, { label: "Gym", query: "gym", icon: Dumbbell },
];

/** How tall the search sheet stands at each of its heights: raised, it stops under the search field. */
const sheetHeights: Record<Sheet, number | string> = { Peek: 250, Half: 520, Full: "calc(100% - 104px)" };
const sheetOrder: readonly Sheet[] = ["Peek", "Half", "Full"];

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
  RerouteKept: "Waiting for a precise location before rerouting. Keeping the current route.",
};

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

type Screen = ReturnType<typeof useScreen>;
/** A saved place with what the atlas knows of it. */
interface Kept { place: number; name: string; spot: Spot }

/** Sends `event` when the screen takes it. */
const offer = (screen: Screen, event: Parameters<Screen["send"]>[0]) => (screen.can(event) ? () => void screen.send(event) : undefined);

/**
 * Maps: the map with its credits, the search and its results, a place's card, its directions and guidance along them,
 * the saved places and the agent's questions. Each control is offered exactly when its event is.
 * @model spec/app/maps/index.md
 */
export function Maps({ runtime, alpha }: Shown<ScreenMachine | CreditsMachine | Resident>) {
  const screen = useScreen(runtime);
  const credits = useCredits(runtime);
  const seen = useSyncExternalStore((wake) => atlas.subscribe(wake), () => atlas.snapshot(), () => atlas.snapshot());
  const [typed, setTyped] = useState("");
  const { state, can, send } = screen;
  if (screen.cause) return <Alert variant="destructive" className="m-4">Alpha could not open Maps</Alert>;
  if (!state || !credits.state) return null;
  const now = mode(state);
  const spot: Spot | undefined = atlas.spot(state.place);
  const way = atlas.way(state.trip.route, state.chosen);
  const coverage = coverageOf(state);
  const tiles = coverage?.available ? coverage.tiles : undefined;
  const saved: Kept[] = state.saved.flatMap((entry) => {
    const found = atlas.spot(entry.place);
    return found === undefined ? [] : [{ ...entry, spot: found }];
  });
  const kept = saved.find((entry) => entry.place === state.place);
  const following = followsThePhone(state) && seen.here !== undefined;
  const style: MapStyle = state.link.basemap === "Cloud" && tiles !== undefined
    ? { kind: "raster", tileSize: tiles.tileSize, minZoom: tiles.minZoom, maxZoom: tiles.maxZoom, tile: (z, x, y, signal) => runtime.runPromise(tile(z, x, y, signal)) }
    : { kind: "vector", url: worldStyle };
  const shownPins = now === "Search" ? seen.results.slice(0, state.results) : state.place !== 0 ? [state.place] : [];
  const pins = shownPins.flatMap((place) => {
    const found = atlas.spot(place);
    return found === undefined ? [] : [{ key: String(place), label: found.name, chosen: place === state.place, at: degreesOf(found.at) }];
  });
  const lift = () => { if (can({ type: "liftPress" })) void send({ type: "liftPress" }); };
  const submit = () => {
    const at = pointIn(typed);
    if (at !== undefined && can({ type: "pinAt", lat: at.lat, lng: at.lng })) return void send({ type: "pinAt", lat: at.lat, lng: at.lng });
    const query = recentOf(state.recent, typed.trim());
    if (can({ type: "search", query, chars: query.length })) void send({ type: "search", query, chars: query.length });
  };
  const typing = (text: string) => {
    setTyped(text);
    const query = recentOf(state.recent, text.trim());
    if (can({ type: "typeQuery", query, chars: query.length, now: untimed })) void send({ type: "typeQuery", query, chars: query.length, now: untimed });
  };
  const cardHeight = now === "Place" ? (spot?.phone === undefined ? 372 : 424) : now === "Directions" ? 300 : 0;
  const floatBottom = (now === "Search" ? (state.sheet === "Peek" ? 250 : 520) : cardHeight || 110) + 14;
  const back = offer(screen, { type: "goBack" });
  const openSearch = offer(screen, { type: "openSearch" });
  return (
    <section aria-label="Maps" className="relative isolate flex flex-1 flex-col overflow-hidden">
      <MapView
        className="absolute inset-0 h-full rounded-none"
        zoomControls={false}
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
        onPin={(key) => offer(screen, { type: "pickResult", place: Number(key) })?.()}
        onPress={(at) => offer(screen, { type: "pressMap", lat: Math.round(at.lat * 1e6), lng: Math.round(at.lng * 1e6), now: untimed })?.()}
        onPressMove={(pixels) => { if (pixels > panPixels) lift(); }}
        onPressEnd={lift}
        onSettled={(view) => void runtime.runPromise(settled(view))}
        onDragged={() => offer(screen, { type: "panMap" })?.()}
      />

      {(now === "Browse" || now === "Search" || now === "Place") && (
        <MapsSearchBar
          className="absolute inset-x-3 top-2 z-10 in-data-[alpha-launcher]:top-13"
          leading={now === "Browse" && <AppBack alpha={alpha} />}
          lead={now === "Browse" ? "search" : "back"}
          onLead={now === "Browse" ? openSearch : back}
          aria-label="Search Maps"
          placeholder="Search"
          maxLength={300}
          value={now === "Place" ? (kept?.name ?? spot?.name ?? "") : typed}
          readOnly={now === "Place"}
          onFocus={openSearch}
          onChange={(event) => typing(event.target.value)}
          onSubmit={submit}
          onClear={now === "Search" && typed !== "" ? () => typing("") : undefined}
        />
      )}
      {(now === "Directions" || now === "Navigating") && (
        <div data-host-chrome="" className="absolute top-0 left-3 z-10 in-data-[alpha-launcher]:top-11 [&_button]:size-11"><AppBack alpha={alpha} /></div>
      )}

      {now === "Browse" && saved.length > 0 && (
        <nav aria-label="Saved places" className="absolute inset-x-0 top-18 z-10 flex touch-pan-x gap-2 overflow-x-auto px-3 pb-2.5 [scrollbar-width:none] in-data-[alpha-launcher]:top-29">
          {saved.map((entry) => (
            <MapsChip key={entry.place} label={entry.name} icon={<Star />} disabled={!can({ type: "pickSaved", place: entry.place })} onClick={offer(screen, { type: "pickSaved", place: entry.place })} />
          ))}
        </nav>
      )}

      {now === "Directions" && spot !== undefined && <DirectionsCard screen={screen} state={state} seen={seen} spot={spot} kept={kept} saved={saved} way={way} back={back} />}
      {now === "Navigating" && spot !== undefined && <Guidance screen={screen} state={state} seen={seen} spot={spot} kept={kept} way={way} />}

      <div className="pointer-events-none absolute inset-x-3 top-17 z-10 flex flex-col gap-2 *:pointer-events-auto in-data-[alpha-launcher]:top-28">
        {state.link.coverage.status === "Failed" && !holding(state.link) && (
          <Banner variant="warn" action={can({ type: "connect" }) && <Button size="sm" variant="outline" onClick={() => void send({ type: "connect" })}>Retry</Button>}>
            Maps could not be reached.
          </Banner>
        )}
        {holding(state.link) && <Alert variant="warn">{`Maps request limit reached. Try again in ${Math.max(1, Math.ceil(state.link.held / 60))} minutes.`}</Alert>}
        {state.link.known && state.link.account === 0 && <Alert variant="info">Sign in to Alpha Cloud to use Maps.</Alert>}
        {can({ type: "retryMap" }) && (
          <Banner variant="warn" action={<Button size="sm" variant="outline" onClick={() => void send({ type: "retryMap" })}>Retry</Button>}>The map could not be drawn.</Banner>
        )}
        {!state.keepable && <Alert variant="warn">Saved places could not be read. Existing data has not been replaced.</Alert>}
        {state.guideNotice !== "Quiet" && <Alert variant="info">{told[state.guideNotice]}</Alert>}
        {state.question !== "NoQuestion" && state.review.showing && (
          <MapsStatusCard role="dialog" aria-label={state.question === "ReadPlace" ? "Share this place with your agent" : "Start this route"}
            text={state.question === "ReadPlace" ? `Your agent asks to read ${spot?.name ?? "this place"}.` : `Your agent proposes this route to ${spot?.name ?? "this place"}.`}
            actions={(
              <>
                {can({ type: "approve" }) && <MapsPillButton size="lg" onClick={() => void send({ type: "approve" })}>{state.question === "ReadPlace" ? "Share" : "Start"}</MapsPillButton>}
                {can({ type: "decline" }) && <MapsPillButton tone="fill" size="lg" onClick={() => void send({ type: "decline" })}>Not now</MapsPillButton>}
              </>
            )} />
        )}
      </div>

      {can({ type: "continueDisclosure" }) && !can({ type: "useMyLocation" }) && (now === "Browse" || now === "Directions") && (
        <MapsStatusCard role="dialog" aria-label="Location" className={cn("absolute inset-x-5 z-10", now === "Directions" ? "top-58 in-data-[alpha-launcher]:top-69" : "top-43.5 in-data-[alpha-launcher]:top-54.5")}
          text="Maps uses your location to show where you are and to plan routes from it. Searches and route points go to the Maps provider; your agent is never told where you are."
          actions={<MapsPillButton size="lg" onClick={() => void send({ type: "continueDisclosure" })}>Continue</MapsPillButton>} />
      )}

      {now !== "Navigating" && can({ type: "useMyLocation" }) && !(now === "Search" && state.sheet === "Full") && (
        <MapsRoundButton tone="float" size="md" aria-label="My location" className="absolute right-4 z-10 transition-[bottom] duration-slow ease-standard" style={{ bottom: floatBottom }} onClick={() => void send({ type: "useMyLocation" })}><LocateFixed /></MapsRoundButton>
      )}
      {now === "Navigating" && can({ type: "recenter" }) && (
        <MapsRoundButton tone="night" size="xl" aria-label="Recenter" className="absolute right-4 bottom-34 z-10" onClick={() => void send({ type: "recenter" })}><LocateFixed /></MapsRoundButton>
      )}
      {now !== "Navigating" && credits.can({ type: "openInfo" }) && (
        <div className="absolute left-3 z-10" style={{ bottom: floatBottom }}>
          {badgeOnly(state.link)
            ? <button type="button" aria-label="Google Maps" onClick={() => void credits.send({ type: "openInfo" })}><img src={googleMaps} alt="Google Maps" width={98} height={18} /></button>
            : <MapsRoundButton tone="float" size="sm" aria-label="Map credits" onClick={() => void credits.send({ type: "openInfo" })}><Info /></MapsRoundButton>}
        </div>
      )}
      {credits.state.infoOpen && (
        <MapsStatusCard role="dialog" aria-label="Map credits" className="absolute inset-x-5 z-50 shadow-md" style={{ bottom: floatBottom + 52 }}
          text={(
            <>
              {credits.state.copyrightShown ? credits.state.copyright : coverage?.available ? coverage.attribution : "Map data © OpenStreetMap contributors, OpenFreeMap"}
              {coverage?.available && <><br />{`Searches and route points go to ${coverage.disclosure.recipients.map((r) => `${r.name} (${r.operator})`).join(", ")} through Alpha Cloud, which keeps only the kind of each request and its result.`}</>}
            </>
          )}
          actions={<MapsPillButton tone="fill" size="md" onClick={() => void credits.send({ type: "closeInfo" })}>Close</MapsPillButton>} />
      )}

      {now === "Search" && <SearchSheet screen={screen} state={state} seen={seen} saved={saved} height={sheetHeights[state.sheet]} onRecent={setTyped} />}
      {now === "Place" && spot !== undefined && <PlaceSheet screen={screen} state={state} spot={spot} kept={kept} coverage={coverage} height={cardHeight} back={back} />}
      {now === "Directions" && <DirectionsSheet screen={screen} state={state} seen={seen} way={way} height={cardHeight} />}

      {(state.notice !== "NoNotice" || state.copyNotice !== "Uncopied") && (
        <p role="status" className="absolute inset-x-5 z-50 rounded-full bg-foreground px-4 py-3 text-center text-sm text-background shadow-md" style={{ bottom: floatBottom + 64 }}>
          {state.notice !== "NoNotice" ? notices[state.notice] : copies[state.copyNotice]}
        </p>
      )}
    </section>
  );
}

/** The search sheet: the recent searches and saved places before typing, then the places found. */
function SearchSheet({ screen, state, seen, saved, height, onRecent }: { screen: Screen; state: State; seen: Seen; saved: Kept[]; height: number | string; onRecent: (query: string) => void }) {
  const { can, send } = screen;
  const nextSheet = sheetOrder[(sheetOrder.indexOf(state.sheet) + 1) % sheetOrder.length] ?? "Half";
  return (
    <MapsSheet aria-label="Search results" height={height}>
      <button type="button" aria-label={nextSheet === "Full" ? "Raise the search" : nextSheet === "Half" ? "Show half the search" : "Lower the search"}
        disabled={!can({ type: "resize", sheet: nextSheet })} onClick={() => void send({ type: "resize", sheet: nextSheet })} className="h-7 shrink-0" />
      <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto pb-30">
        {state.search.status === "Loading" && <Spinner className="mx-5 my-2" label="Searching" />}
        {state.search.status === "Failed" && !holding(state.link) && <p role="status" className="px-5 py-2 text-sm text-muted-foreground">The search failed.</p>}
        {state.query === "" && (
          <nav aria-label="Kinds of place" className="flex touch-pan-x gap-2 overflow-x-auto px-5 pt-1 pb-3.5 [scrollbar-width:none]">
            {kindsOfPlace.map(({ label, query, icon: Icon }) => (
              <MapsChip key={query} tone="fill" label={label} icon={<Icon />} disabled={!can({ type: "search", query, chars: query.length })}
                onClick={() => { onRecent(query); void send({ type: "search", query, chars: query.length }); }} />
            ))}
          </nav>
        )}
        {state.query === "" && state.recent.length > 0 && (
          <div>
            <div className="flex items-center justify-between pr-3 pl-5">
              <span className="text-meta font-semibold text-muted-foreground">Recent</span>
              {can({ type: "clearRecent" }) && <button type="button" aria-label="Clear recent searches" className="min-h-12 px-2 text-sm font-semibold text-primary" onClick={() => void send({ type: "clearRecent" })}>Clear</button>}
            </div>
            {state.recent.map((query) => (
              <button key={query} type="button" aria-label={`Search ${query}`} disabled={!can({ type: "search", query, chars: query.length })}
                className="flex min-h-12 w-full items-center gap-3.5 px-5 py-1 text-left active:bg-accent"
                onClick={() => { onRecent(query); void send({ type: "search", query, chars: query.length }); }}>
                <Clock aria-hidden className="size-5 shrink-0 text-muted-foreground" /><span className="truncate text-body leading-tight">{query}</span>
              </button>
            ))}
          </div>
        )}
        {state.query === "" && saved.map((entry) => (
          <MapsPlaceRow key={entry.place} aria-label={entry.name} name={entry.name} detail={entry.spot.category || entry.spot.address} icon={<Star />}
            disabled={!can({ type: "pickSaved", place: entry.place })} onClick={() => void send({ type: "pickSaved", place: entry.place })} />
        ))}
        {seen.results.slice(0, state.results).map((place) => {
          const found = atlas.spot(place);
          return found && (
            <MapsPlaceRow key={place} aria-label={found.name} name={found.name} detail={[found.category, found.address].filter(Boolean).join(" · ")} icon={<MapPin />}
              disabled={!can({ type: "pickResult", place })} onClick={() => void send({ type: "pickResult", place })} />
          );
        })}
        {state.search.status === "Loaded" && state.results === 0 && (
          <div role="status" className="flex flex-col items-center gap-2.5 px-5 pt-4.5 pb-1.5 text-muted-foreground">
            <Search aria-hidden className="size-7" /><span className="text-base">No places</span>
          </div>
        )}
      </div>
    </MapsSheet>
  );
}

/** A place's card: its name and kind, Directions, Save, Share and the like, its address and number. */
function PlaceSheet({ screen, state, spot, kept, coverage, height, back }: { screen: Screen; state: State; spot: Spot; kept: Kept | undefined; coverage: Coverage | undefined; height: number; back: (() => void) | undefined }) {
  const [name, setName] = useState("");
  const { can, send } = screen;
  const saveName = kept?.name ?? spot.name;
  const inside = !coverage?.available || coverage.regions.some(({ bounds: [west, south, east, north] }) => {
    const at = degreesOf(spot.at);
    return at.lng >= west && at.lng <= east && at.lat >= south && at.lat <= north;
  });
  return (
    <MapsSheet aria-label={saveName} height={height} className="px-5 pt-4.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-3xl font-light break-words">{saveName}</h2>
          {can({ type: "startRenaming" }) && <button type="button" aria-label="Rename place" className="min-h-12 px-3 text-primary" onClick={() => void send({ type: "startRenaming" })}>Rename</button>}
          <div className="mt-1.5 text-sm leading-tight text-muted-foreground">{[spot.category || "Place", spot.address].filter(Boolean).join(" · ")}</div>
          {spot.hours !== undefined && <div className="mt-1 text-sm leading-tight">{spot.hours}</div>}
        </div>
        <MapsRoundButton tone="fill" size="sm" aria-label="Close place" className="-mt-0.5 -mr-1.5" disabled={!back} onClick={back}><X className="size-4.5" /></MapsRoundButton>
      </div>
      <div className="mt-5 flex items-center gap-2">
        {can({ type: "openDirections" }) && <MapsPillButton className="flex-1" aria-label="Directions" onClick={() => void send({ type: "openDirections" })}><Car aria-hidden className="size-5.5" />Directions</MapsPillButton>}
        {kept === undefined
          ? can({ type: "namePlace", name: saveName }) && <MapsRoundButton aria-label="Save" aria-pressed={false} onClick={() => void send({ type: "namePlace", name: saveName })}><Star /></MapsRoundButton>
          : can({ type: "forgetPlace" }) && <MapsRoundButton aria-label="Remove from saved" aria-pressed className="text-primary" onClick={() => void send({ type: "forgetPlace" })}><Star className="fill-current" /></MapsRoundButton>}
        {can({ type: "handOn", kind: "SharePlace" }) && <MapsRoundButton aria-label="Share" onClick={() => void send({ type: "handOn", kind: "SharePlace" })}><Share2 /></MapsRoundButton>}
        {spot.website !== undefined && can({ type: "handOn", kind: "Website" }) && <MapsRoundButton aria-label="Website" onClick={() => void send({ type: "handOn", kind: "Website" })}><Globe /></MapsRoundButton>}
        {can({ type: "handOn", kind: "MapsApp" }) && <MapsRoundButton aria-label="Open in another app" onClick={() => void send({ type: "handOn", kind: "MapsApp" })}><ExternalLink /></MapsRoundButton>}
      </div>
      {spot.address !== undefined && <div className="mt-5 flex items-center gap-2.5 text-sm leading-tight text-muted-foreground"><MapPin aria-hidden className="size-4.5 shrink-0" />{spot.address}</div>}
      {spot.phone !== undefined && (
        <div className="mt-1 flex min-h-12 items-center gap-2.5 text-sm text-muted-foreground">
          <Phone aria-hidden className="size-4.5 shrink-0" /><span className="min-w-0 flex-1 text-foreground">{spot.phone}</span>
          {can({ type: "handOn", kind: "Call" }) && <button type="button" aria-label={`Call ${spot.phone}`} className="min-h-12 px-3 font-semibold text-primary" onClick={() => void send({ type: "handOn", kind: "Call" })}>Call</button>}
          {can({ type: "handOn", kind: "CopyNumber" }) && <button type="button" aria-label="Copy phone number" className="min-h-12 px-3 font-semibold text-primary" onClick={() => void send({ type: "handOn", kind: "CopyNumber" })}>Copy</button>}
        </div>
      )}
      {state.renaming && can({ type: "namePlace", name: name.trim() || saveName }) && (
        <form className="mt-3.5 flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); void send({ type: "namePlace", name: name.trim() || saveName }); setName(""); }}>
          <Input aria-label="Place name" placeholder={saveName} maxLength={300} value={name} onChange={(event) => setName(event.target.value)}
            className="h-11 min-w-0 flex-1 rounded-full border-0 bg-secondary px-3.5" />
          <MapsPillButton tone="fill" size="md" type="submit" aria-label="Apply place name">Done</MapsPillButton>
        </form>
      )}
      {coverage?.available && saysOutsideCoverage(state, inside) && <p className="mt-2 text-sm text-muted-foreground">{`This location is outside ${coverage.sources.data} coverage.`}</p>}
      {!hasRoom(state.saved, state.place) && !googleShown(state) && kept === undefined && <p className="mt-2 text-sm text-muted-foreground">Saved places are full. Remove one before adding another.</p>}
      {can({ type: "returnToEvent" }) && <MapsPillButton tone="fill" size="sm" className="mt-2 gap-1 self-start pr-3.5 pl-2 text-sm" onClick={() => void send({ type: "returnToEvent" })}><ChevronLeft aria-hidden />Event</MapsPillButton>}
    </MapsSheet>
  );
}

/** The card over the top of the map in directions: where from, where to, and how to travel. */
function DirectionsCard({ screen, state, seen, spot, kept, saved, way, back }: { screen: Screen; state: State; seen: Seen; spot: Spot; kept: Kept | undefined; saved: Kept[]; way: Way | undefined; back: (() => void) | undefined }) {
  const [start, setStart] = useState("");
  const { can, send } = screen;
  const startAt = pointIn(start);
  const startFrom = () => {
    if (startAt !== undefined && can({ type: "planFrom", origin: "Coordinates", lat: startAt.lat, lng: startAt.lng })) {
      return void send({ type: "planFrom", origin: "Coordinates", lat: startAt.lat, lng: startAt.lng });
    }
    if (startAt === undefined && can({ type: "findOrigin", query: start.trim() })) void send({ type: "findOrigin", query: start.trim() });
  };
  const starts = state.originsFound > 0 ? seen.origins.slice(0, state.originsFound).flatMap((place) => {
    const found = atlas.spot(place);
    return found === undefined || place === state.place ? [] : [{ place, name: found.name, spot: found }];
  }) : [];
  const typed = start.trim().toLowerCase();
  const options = (typed === "" && starts.length === 0 ? [] : [...starts, ...saved.filter((entry) => entry.place !== state.place && !starts.some((found) => found.place === entry.place) && entry.name.toLowerCase().includes(typed))])
    .filter((entry) => entry.place !== state.startPlace);
  const from = state.startPlace === 0 ? undefined : atlas.spot(state.startPlace);
  return (
    <div data-host-chrome="" className="absolute inset-x-3 top-13 z-10 rounded-sheet bg-background pt-1.5 pr-3 pb-3 pl-1 shadow-md ring-1 ring-border motion-safe:animate-drop in-data-[alpha-launcher]:top-24">
      <div className="flex items-center gap-1">
        <MapsRoundButton tone="plain" size="sm" aria-label="Back to place" disabled={!back} onClick={back}><ChevronLeft /></MapsRoundButton>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {can({ type: "findOrigin", query: "start" }) && (
            <form className="flex items-center gap-1.5" onSubmit={(event) => { event.preventDefault(); startFrom(); }}>
              <Input aria-label="Starting point" maxLength={300} value={start} onChange={(event) => setStart(event.target.value)}
                placeholder={from?.name ?? (can({ type: "planFrom", origin: "Coordinates", lat: 0, lng: 0 }) ? "Place, or latitude, longitude" : "My location")}
                className={cn("h-11 min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 text-body leading-tight focus-visible:outline-none", from && "placeholder:text-foreground")} />
              {can({ type: "useMyLocation" }) && <MapsRoundButton tone="plain" size="sm" aria-label="Use my location" onClick={() => void send({ type: "useMyLocation" })}><LocateFixed /></MapsRoundButton>}
            </form>
          )}
          <div className="flex h-8 items-center gap-3 text-base font-semibold"><MapPin aria-hidden className="size-4.5 text-primary" /><span className="truncate">{kept?.name ?? spot.name}</span></div>
        </div>
        {can({ type: "swapEnds", lat: spot.at.lat, lng: spot.at.lng }) && (
          <MapsRoundButton tone="plain" size="md" aria-label="Swap starting point and destination" onClick={() => void send({ type: "swapEnds", lat: spot.at.lat, lng: spot.at.lng })}><ArrowUpDown /></MapsRoundButton>
        )}
      </div>
      {state.origins.status === "Loading" && <Spinner className="mt-2 ml-2" label="Finding the starting point" />}
      {state.origins.status === "Loaded" && state.originsFound === 0 && <p className="mt-2 ml-2 text-sm text-muted-foreground">No starting point found.</p>}
      {options.map((entry) => can({ type: "startFrom", place: entry.place, lat: entry.spot.at.lat, lng: entry.spot.at.lng }) && (
        <MapsPlaceRow key={entry.place} className="px-2" aria-label={`From ${entry.name}`} name={entry.name} icon={<MapPin />} onClick={() => { setStart(""); void send({ type: "startFrom", place: entry.place, lat: entry.spot.at.lat, lng: entry.spot.at.lng }); }} />
      ))}
      <div role="group" aria-label="Travel mode" className="mt-2 ml-2 flex flex-wrap gap-1.5">
        {ways.filter(({ travel }) => offers(state.link.offer, travel)).map(({ travel, label, icon: Icon }) => {
          const on = state.trip.travel === travel;
          return (
            <MapsPillButton key={travel} size="sm" tone={on ? "accent" : "fill"} className="min-w-max flex-1 gap-1.25" aria-label={label} aria-pressed={on}
              disabled={!on && !can({ type: "chooseTravel", travel })} onClick={on ? undefined : () => void send({ type: "chooseTravel", travel })}>
              <Icon aria-hidden />{on && way !== undefined ? minutes(way.seconds) : label}
            </MapsPillButton>
          );
        })}
      </div>
      {can({ type: "returnToEvent" }) && (
        <MapsPillButton tone="fill" size="sm" className="mt-2 ml-2 gap-1 pr-3.5 pl-2 text-sm" onClick={() => void send({ type: "returnToEvent" })}><ChevronLeft aria-hidden />Event</MapsPillButton>
      )}
    </div>
  );
}

/** The directions sheet: the route's time and length, the routes to choose from, Start and its steps. */
function DirectionsSheet({ screen, state, seen, way, height }: { screen: Screen; state: State; seen: Seen; way: Way | undefined; height: number }) {
  const { can, send } = screen;
  const alternatives = seen.ways.get(state.trip.route) ?? [];
  return (
    <MapsSheet aria-label="Directions" height={height} className="px-5 pt-5.5">
      {way !== undefined && (
        <div className="flex items-baseline gap-3">
          <span className="font-display text-figure font-light">{minutes(way.seconds)}</span>
          <span className="text-base text-muted-foreground">{distance(way.meters)}</span>
        </div>
      )}
      {state.trip.plan.status === "Loading" && <Spinner label="Planning the route" />}
      {state.trip.plan.status === "Failed" && !holding(state.link) && <p role="status" className="text-sm text-muted-foreground">No route was found.</p>}
      {alternatives.length > 1 && (
        <fieldset aria-label="Routes" className="mt-3.5 flex min-w-0 flex-col gap-1.5">
          {alternatives.map((option, index) => {
            const on = index === state.chosen;
            return (
              <MapsPillButton key={`${option.seconds} ${option.meters} ${option.turns.length}`} size="md" tone={on ? "accent" : "fill"} className="justify-between" aria-pressed={on}
                aria-label={`${index === 0 ? "Recommended" : `Alternative ${index}`}: ${minutes(option.seconds)}, ${distance(option.meters)}`}
                disabled={!can({ type: "chooseRoute", index, turns: Math.max(1, option.turns.length) })}
                onClick={() => void send({ type: "chooseRoute", index, turns: Math.max(1, option.turns.length) })}>
                <span>{index === 0 ? "Recommended" : `Alternative ${index}`}</span><span>{`${minutes(option.seconds)} · ${distance(option.meters)}`}</span>
              </MapsPillButton>
            );
          })}
        </fieldset>
      )}
      <div className="mt-5 flex gap-2">
        <MapsPillButton size="xl" className="flex-1" disabled={!can({ type: "startGuidance" })} onClick={() => void send({ type: "startGuidance" })}><Navigation aria-hidden className="fill-current" />Start</MapsPillButton>
        {can({ type: "handOn", kind: "EtaShare" }) && <MapsRoundButton size="2xl" aria-label="Share arrival" onClick={() => void send({ type: "handOn", kind: "EtaShare" })}><Share2 /></MapsRoundButton>}
      </div>
      {way !== undefined && way.turns.length > 0 && (
        <details className="mt-3.5 min-h-0 overflow-y-auto">
          <summary className="min-h-12 cursor-pointer content-center text-base font-semibold">Steps</summary>
          <ol>
            {way.turns.map((step) => (
              <li key={`${step.instruction} ${step.at.lat} ${step.at.lng}`} className="flex justify-between gap-3 border-t border-border py-3 text-sm"><span className="min-w-0">{step.instruction}</span><span className="shrink-0 text-muted-foreground">{distance(step.meters)}</span></li>
            ))}
          </ol>
        </details>
      )}
    </MapsSheet>
  );
}

/** Guidance: the next turn in Alpha blue at the top, and what is left with End at the foot. */
function Guidance({ screen, state, seen, spot, kept, way }: { screen: Screen; state: State; seen: Seen; spot: Spot; kept: Kept | undefined; way: Way | undefined }) {
  const { can, send } = screen;
  const turn = way?.turns[state.trip.turn];
  const after = way?.turns[state.trip.turn + 1];
  const arrived = state.trip.guidance === "Arrived";
  const precise = seen.here !== undefined && !seen.here.approximate && !state.trip.rerouting;
  return (
    <>
      <div data-host-chrome="" role="status" className="absolute inset-x-3 top-12.5 z-50 flex items-center gap-4 rounded-sheet bg-alpha px-5 py-4.5 text-alpha-foreground shadow-lg motion-safe:animate-drop in-data-[alpha-launcher]:top-23.5">
        {arrived ? <Check aria-hidden className="size-13 shrink-0" /> : <Navigation aria-hidden className="size-13 shrink-0" />}
        <div className="min-w-0">
          {!arrived && precise && turn !== undefined && <div className="font-display text-4xl leading-none font-light">{distance(turn.meters)}</div>}
          <div className="mt-1 truncate text-lead font-semibold">
            {arrived ? (kept?.name ?? spot.name) : seen.here === undefined ? "Waiting for your location" : seen.here.approximate ? "Turn guidance needs a precise location" : state.trip.rerouting ? "Finding a new route" : turn?.instruction ?? ""}
          </div>
        </div>
      </div>
      {!arrived && after !== undefined && (
        <div className="absolute top-39.5 left-7 z-10 flex h-10 items-center gap-2 rounded-b-lg bg-alpha px-3.5 text-sm font-semibold text-alpha-foreground brightness-75 in-data-[alpha-launcher]:top-50.5">
          Then<span className="max-w-55 truncate">{after.instruction}</span>
        </div>
      )}
      {/* eslint-disable-next-line better-tailwindcss/no-unknown-classes -- Guidance stays dark in both themes, as on develop; `dark` is the design system's theme class. */}
      <div data-host-chrome="bottom" className="dark absolute inset-x-3 bottom-6.5 z-50 grid grid-cols-[56px_minmax(0,1fr)_56px] items-center gap-3 rounded-home-card bg-secondary p-2.5 text-secondary-foreground motion-safe:animate-rise">
        <MapsRoundButton tone="nightFill" size="2xl" aria-label="End navigation" disabled={!can({ type: "endGuidance" })} onClick={() => void send({ type: "endGuidance" })}><X /></MapsRoundButton>
        <div className="min-w-0 text-center">
          <div className="font-display text-figure-sm font-light">{arrived ? "Arrived" : way === undefined ? "" : minutes(way.seconds)}</div>
          {way !== undefined && <div className="mt-0.75 text-meta leading-tight text-muted-foreground">{arrived ? spot.address : distance(way.meters)}</div>}
        </div>
      </div>
    </>
  );
}
