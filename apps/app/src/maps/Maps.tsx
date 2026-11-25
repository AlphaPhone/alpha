// spec/app/maps/index.md, "Story: Move between the screen's modes"; spec/app/maps/index.md, "Story: Search for a place"; spec/app/maps/index.md, "Story: Look at a place"; spec/app/maps/index.md, "Story: Get directions"; spec/app/maps/index.md, "Story: Navigate"; spec/app/maps/index.md, "Story: Use my location"; spec/app/maps/index.md, "Story: Let the agent help with Maps"; spec/app/maps/credits.md, "Story: See the map for what I am looking at"
import { Alert, Banner, Button, cn, dockClearance, focusRing, Input, type MapCamera, MapsChip, MapsPillButton, MapsPlaceRow, MapsRoundButton, MapsSearchBar, MapsSheet, MapsStatusCard, type MapStyle, MapView, Spinner } from "@repo/ui";
import { ArrowUpDown, Bike, Bus, Car, Check, ChevronLeft, Clock, Coffee, Dumbbell, ExternalLink, Footprints, Fuel, Globe, Info, LocateFixed, type LucideIcon, MapPin, Navigation, Phone, RotateCw, Search, Share2, ShoppingCart, SquarePlus, Star, Utensils, X } from "lucide-react";
import { useRef, useState, useSyncExternalStore } from "react";
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
import { hasRoom, servedHere } from "../../gen/app__maps__places.ts";
import { Atlas, type AtlasStore, type Coverage, type Seen, type Spot, type Way } from "./atlas.vibe";
import { degreesOf, meters, normalizeLng, pointIn } from "./geometry.ts";
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

/** How tall the sheet stands at each of its heights: raised, it stops under the search field. */
const sheetHeights: Record<Sheet, number | string> = { Peek: 250, Half: 520, Full: "calc(100% - var(--alpha-safe-top) - 5.5rem)" };
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
  RerouteKept: "Rerouting needs a precise, up-to-date location. The current route was kept.",
};

const copies: Record<CopyNotice, string> = { Uncopied: "", NumberCopied: "Number copied", CopyFailed: "Couldn't copy" };

/** The recent search `typed` is, in any case, or `typed` itself. */
const recentOf = (recent: readonly string[], typed: string) => recent.find((query) => query.toLowerCase() === typed.toLowerCase()) ?? typed;

const minutes = (seconds: number) => `${Math.max(1, Math.round(seconds / 60))} min`;
const distance = (length: number) => (length < 1000 ? `${Math.max(0, Math.round(length))} m` : `${(length / 1000).toFixed(1)} km`);

function waitMessage(state: State): string {
  if (state.link.wait === "AllowanceSpent") {
    return `You have used your Maps allowance for this period. It resets in ${Math.max(1, Math.ceil(state.link.held / 86400))} days.`;
  }
  if (state.link.wait === "Unnamed") return "Maps request limit reached. Try again later.";
  return `Maps request limit reached. Try again in ${Math.max(1, Math.ceil(state.link.held / 60))} minutes.`;
}

// spec/app/maps/credits.md, "The camera goes to what the owner picked, on every map"
/** Where the camera goes for `state`, named so the map applies each aim once. */
function cameraOf(state: State, seen: Seen, store: AtlasStore, following: boolean, recentered: number): MapCamera {
  const now = mode(state);
  if (now === "Navigating" && !following) return { kind: "keep" };
  const way = now === "Directions" || now === "Navigating" ? store.way(state.trip.route, state.chosen) : undefined;
  const spot = store.spot(state.place);
  const results = state.place === 0 && state.search.status === "Loaded" ? seen.results.slice(0, state.results) : [];
  const aim = cameraAim(following, way !== undefined, true, spot !== undefined, true, true, results.length);
  if (aim === "FollowPhone" && seen.here !== undefined) return { kind: "follow", key: `here:${seen.here.at.lat}:${seen.here.at.lng}:${recentered}`, at: degreesOf(seen.here.at) };
  if (aim === "FitRoute" && way !== undefined) return { kind: "fit", key: `route:${state.trip.route}:${state.chosen}`, points: way.line.map(degreesOf), maxZoom: routeMaxZoom };
  if (aim === "CenterOnPlace" && spot !== undefined) return { kind: "centre", key: `place:${state.place}`, at: degreesOf(spot.at), zoom: placeZoom };
  if (aim === "FitResults") {
    const points = results.flatMap((place) => store.spot(place)?.at ?? []).map(degreesOf);
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

/** Shared accessible drag-and-tap handle for Maps sheets. */
function SheetGrabber({ screen, sheet, label }: { screen: Screen; sheet: Sheet; label: string }) {
  const { can, send } = screen;
  const startYRef = useRef<number | undefined>(undefined);
  const nextSheet = sheetOrder[(sheetOrder.indexOf(sheet) + 1) % sheetOrder.length] ?? "Half";
  const canStep = can({ type: "resize", sheet: nextSheet });
  const resizeTo = (target: Sheet) => {
    if (can({ type: "resize", sheet: target })) void send({ type: "resize", sheet: target });
  };
  const endDrag = (clientY: number) => {
    const began = startYRef.current;
    startYRef.current = undefined;
    if (began === undefined) return;
    const delta = clientY - began;
    const idx = sheetOrder.indexOf(sheet);
    const higher = sheetOrder[idx + 1];
    const lower = sheetOrder[idx - 1];
    if (delta < -28 && higher !== undefined) resizeTo(higher);
    else if (delta > 28 && lower !== undefined) resizeTo(lower);
  };
  return (
    <button
      type="button"
      aria-label={label}
      disabled={!canStep}
      onClick={() => resizeTo(nextSheet)}
      onPointerDown={(event) => {
        startYRef.current = event.clientY;
        try { event.currentTarget.setPointerCapture(event.pointerId); } catch { return; }
      }}
      onPointerUp={(event) => endDrag(event.clientY)}
      onPointerCancel={() => { startYRef.current = undefined; }}
      onLostPointerCapture={() => { startYRef.current = undefined; }}
      className={cn(focusRing, "flex min-h-11 w-full shrink-0 touch-none items-center justify-center rounded-t-sheet")}
    >
      <span aria-hidden className="h-1 w-10 rounded-full bg-muted-foreground/40" />
    </button>
  );
}

/**
 * Maps: the map with its credits, the search and its results, a place's card, its directions and guidance along them,
 * the saved places and the agent's questions. Each control is offered exactly when its event is.
 * @model spec/app/maps/index.md
 */
export function Maps({ runtime, alpha }: Shown<ScreenMachine | CreditsMachine | Atlas | Resident>) {
  const screen = useScreen(runtime);
  const credits = useCredits(runtime);
  const store = runtime.runSync(Atlas);
  const seen = useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
  const [typed, setTyped] = useState("");
  const [recentered, setRecentered] = useState(0);
  const { state, can, send } = screen;
  if (screen.cause) return <Alert variant="destructive" className="m-4">Alpha could not open Maps</Alert>;
  if (!state || !credits.state) return null;
  const now = mode(state);
  const spot: Spot | undefined = store.spot(state.place);
  const way = store.way(state.trip.route, state.chosen);
  const coverage = coverageOf(state, store);
  const tiles = coverage?.available ? coverage.tiles : undefined;
  const googleMapMissing = state.link.google && tiles === undefined;
  const saved: Kept[] = state.saved.flatMap((entry) => {
    const found = store.spot(entry.place);
    return found === undefined ? [] : [{ ...entry, spot: found }];
  });
  const kept = saved.find((entry) => entry.place === state.place);
  const following = followsThePhone(state) && seen.here !== undefined;
  const style: MapStyle = state.link.basemap === "Cloud" && tiles !== undefined
    ? { kind: "raster", tileSize: tiles.tileSize, minZoom: tiles.minZoom, maxZoom: tiles.maxZoom, tile: (z, x, y, signal) => runtime.runPromise(tile(z, x, y, signal)) }
    : { kind: "vector", url: worldStyle };
  const shownPins = now === "Search" ? seen.results.slice(0, state.results) : state.place !== 0 ? [state.place] : [];
  const pins = shownPins.flatMap((place) => {
    const found = store.spot(place);
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
    if (text === "") {
      if (can({ type: "search", query: "", chars: 0 })) void send({ type: "search", query: "", chars: 0 });
      return;
    }
    if (pointIn(text) !== undefined) {
      if (can({ type: "typeQuery", query: "", chars: 0, now: untimed })) void send({ type: "typeQuery", query: "", chars: 0, now: untimed });
      return;
    }
    const query = recentOf(state.recent, text.trim());
    if (can({ type: "typeQuery", query, chars: query.length, now: untimed })) void send({ type: "typeQuery", query, chars: query.length, now: untimed });
  };
  const cardHeight = now === "Place"
    ? (state.sheet === "Full" ? sheetHeights.Full : state.sheet === "Peek" ? 250 : (spot?.phone === undefined ? 372 : 424))
    : now === "Directions"
      ? (state.sheet === "Full" ? sheetHeights.Full : state.sheet === "Peek" ? 250 : 320)
      : 0;
  const numericFloat = now === "Search" ? (state.sheet === "Peek" ? 250 : 520) : typeof cardHeight === "number" && cardHeight > 0 ? cardHeight : 96;
  const floatBottom = `calc(${numericFloat + 14}px + max(var(--alpha-dock-overlap, 0px), var(--alpha-safe-bottom)))`;
  const goBack = offer(screen, { type: "goBack" });
  const back = credits.state.infoOpen && credits.can({ type: "closeInfo" })
    ? () => void credits.send({ type: "closeInfo" })
    : goBack
      ? () => { if (now === "Search") setTyped(""); goBack(); }
      : undefined;
  const openSearch = offer(screen, { type: "openSearch" });
  const retryMap = offer(screen, { type: "retryMap" });
  const myLocation = offer(screen, { type: "useMyLocation" });
  const locationDisclosure = can({ type: "continueDisclosure" }) && myLocation === undefined && (now === "Browse" || now === "Directions");
  const showRecovery = retryMap !== undefined && !locationDisclosure && now !== "Navigating";
  const hideFloatingForFullSheet = (now === "Search" || now === "Place" || now === "Directions") && state.sheet === "Full";
  const searchDisplayValue = now === "Place" ? (kept?.name ?? spot?.name ?? "") : now === "Search" ? typed : "";
  return (
    <section aria-label="Maps" className="relative isolate flex flex-1 flex-col overflow-hidden">
      {googleMapMissing ? (
        <div role="status" className="absolute inset-0 flex items-center justify-center bg-muted px-6 text-center text-sm text-muted-foreground">
          The Google map is missing.
        </div>
      ) : (
        <MapView
          className="absolute inset-0 h-full rounded-none"
          zoomControls={false}
          label={spot === undefined ? "Map" : `Map of ${spot.name}`}
          surface={state.link.plane}
          style={style}
          pins={pins}
          here={seen.here === undefined ? undefined : degreesOf(seen.here.at)}
          line={now === "Directions" || now === "Navigating" ? way?.line.map(degreesOf) : undefined}
          camera={cameraOf(state, seen, store, following, recentered)}
          compass={(bearing, pitch) => compassShown(bearing, pitch, following)}
          onReady={(plane) => { if (can({ type: "reportMap", plane, ok: true })) void send({ type: "reportMap", plane, ok: true }); }}
          onTrouble={(plane, trouble) => {
            if (breaksThePlane(trouble.styleLoaded, trouble.tileError, trouble.cancelled) && can({ type: "reportMap", plane, ok: false })) void send({ type: "reportMap", plane, ok: false });
          }}
          onPin={(key) => offer(screen, { type: "pickResult", place: Number(key) })?.()}
          onPress={(at) => offer(screen, { type: "pressMap", lat: Math.round(at.lat * 1e6), lng: Math.round(normalizeLng(at.lng) * 1e6), now: untimed })?.()}
          onPressMove={(pixels) => { if (pixels > panPixels) lift(); }}
          onPressEnd={lift}
          onSettled={(view) => void runtime.runPromise(settled(view))}
          onDragged={() => offer(screen, { type: "panMap" })?.()}
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 top-[calc(var(--alpha-safe-top)+0.5rem)] z-10 flex flex-col gap-2 px-3 *:pointer-events-auto">
        {(now === "Browse" || now === "Search" || now === "Place") && (
          <MapsSearchBar
            leading={now === "Browse" && <AppBack alpha={alpha} />}
            lead={now === "Browse" ? "search" : "back"}
            onLead={now === "Browse" ? openSearch : back}
            aria-label="Search Maps"
            placeholder="Search"
            maxLength={300}
            value={searchDisplayValue}
            readOnly={now === "Place"}
            onFocus={openSearch}
            onChange={(event) => typing(event.target.value)}
            onSubmit={submit}
            onClear={now === "Search" && typed !== "" ? () => typing("") : undefined}
          />
        )}
        {(now === "Directions" || now === "Navigating") && (
          <div data-host-chrome="" className="self-start [&_button]:size-11"><AppBack alpha={alpha} /></div>
        )}

        {now === "Browse" && saved.length > 0 && (
          <nav aria-label="Saved places" className="-mx-3 flex touch-pan-x gap-2 overflow-x-auto px-3 py-1 [scrollbar-width:none]">
            {saved.map((entry) => (
              <MapsChip key={entry.place} label={entry.name} icon={<Star />} disabled={!can({ type: "pickSaved", place: entry.place })} onClick={offer(screen, { type: "pickSaved", place: entry.place })} />
            ))}
          </nav>
        )}

        {now === "Directions" && spot !== undefined && (
          <DirectionsCard key={`${state.link.account}:${state.place}:${state.startPlace}`} screen={screen} state={state} seen={seen} store={store} spot={spot} kept={kept} saved={saved} coverage={coverage} way={way} back={back} />
        )}
        {now === "Navigating" && spot !== undefined && (
          <GuidanceHeader screen={screen} state={state} seen={seen} spot={spot} kept={kept} way={way} onRecenter={() => setRecentered((n) => n + 1)} />
        )}

        <div className="flex flex-col gap-2">
          {state.link.unoffered && <Alert variant="info">Maps unavailable</Alert>}
          {state.link.coverage.status === "Failed" && !holding(state.link) && (
            <Banner variant="warn" action={can({ type: "connect" }) && <Button size="sm" variant="outline" onClick={() => void send({ type: "connect" })}>Retry</Button>}>
              Maps could not be reached.
            </Banner>
          )}
          {holding(state.link) && <Alert variant="warn">{waitMessage(state)}</Alert>}
          {state.link.known && state.link.account === 0 && <Alert variant="info">Sign in to Alpha Cloud to use Maps.</Alert>}
          {state.missedFix && <Alert variant="info">No location fix arrived.</Alert>}
          {retryMap && !showRecovery && (
            <Banner variant="warn" action={<Button size="sm" variant="outline" onClick={retryMap}>Retry</Button>}>The map could not be drawn.</Banner>
          )}
          {!state.keepable && <Alert variant="warn">Saved places could not be read. Existing data has not been replaced.</Alert>}
          {state.guideNotice !== "Quiet" && <Alert variant="info">{told[state.guideNotice]}</Alert>}
        </div>
      </div>

      {state.question !== "NoQuestion" && state.review.showing && (
        <div className="pointer-events-none absolute inset-x-4 top-[calc(var(--alpha-safe-top)+5rem)] z-dialog *:pointer-events-auto">
          <MapsStatusCard role="dialog" aria-label={state.question === "ReadPlace" ? "Share this place with your agent" : "Start this route"}
            text={state.question === "ReadPlace" ? `Your agent asks to read ${spot?.name ?? "this place"}.` : `Your agent proposes this route to ${spot?.name ?? "this place"}.`}
            actions={(
              <>
                {can({ type: "approve" }) && <MapsPillButton size="lg" onClick={() => void send({ type: "approve" })}>{state.question === "ReadPlace" ? "Share" : "Start"}</MapsPillButton>}
                {can({ type: "decline" }) && <MapsPillButton tone="fill" size="lg" onClick={() => void send({ type: "decline" })}>Not now</MapsPillButton>}
              </>
            )} />
        </div>
      )}

      {showRecovery && (
        <MapsStatusCard data-alpha-maps-status="" data-map-state="error"
          className="absolute inset-x-5 top-[calc(var(--alpha-safe-top)+9.5rem)] z-dialog max-h-[calc(100%-15rem)] overflow-y-auto leading-chat"
          text={<span role="status">Map rendering is unavailable. Retry the map or open a saved place.</span>}
          actions={(
            <>
              {myLocation && <MapsPillButton size="lg" className="text-sm font-normal" onClick={myLocation}>My location</MapsPillButton>}
              <MapsPillButton size="lg" tone="fill" aria-label="Retry map" className="gap-1.5 px-3 text-sm font-normal" onClick={retryMap}><RotateCw aria-hidden className="size-4.5" />Retry</MapsPillButton>
            </>
          )} />
      )}

      {locationDisclosure && (
        <MapsStatusCard role="dialog" aria-label="Location" className="absolute inset-x-5 top-[calc(var(--alpha-safe-top)+10.5rem)] z-dialog"
          text="Maps uses your location to show where you are and to plan routes from it. Searches and route points go to the Maps provider; your agent is never told where you are."
          actions={<MapsPillButton size="lg" onClick={() => void send({ type: "continueDisclosure" })}>Continue</MapsPillButton>} />
      )}

      {now !== "Navigating" && myLocation && !hideFloatingForFullSheet && (
        <MapsRoundButton tone="float" size="md" aria-label="My location" className="absolute right-4 z-10 transition-[bottom] duration-slow ease-standard motion-reduce:transition-none" style={{ bottom: floatBottom }} onClick={myLocation}><LocateFixed /></MapsRoundButton>
      )}
      {now !== "Navigating" && !hideFloatingForFullSheet && credits.can({ type: "openInfo" }) && (
        <div className="absolute left-3 z-10 transition-[bottom] duration-slow ease-standard motion-reduce:transition-none" style={{ bottom: floatBottom }}>
          {badgeOnly(state.link)
            ? (
              <button type="button" aria-label="Google Maps" onClick={() => void credits.send({ type: "openInfo" })}
                className={cn(focusRing, "inline-flex min-h-11 items-center rounded-full bg-background/90 px-3 shadow-sm")}>
                <img src={googleMaps} alt="Google Maps" width={98} height={18} className="dark:invert" />
              </button>
            )
            : <MapsRoundButton tone="float" size="sm" aria-label="Map credits" onClick={() => void credits.send({ type: "openInfo" })}><Info /></MapsRoundButton>}
        </div>
      )}
      {credits.state.infoOpen && (
        <MapsStatusCard role="dialog" aria-label="Map credits"
          className="absolute inset-x-5 bottom-[calc(max(var(--alpha-dock-overlap,0px),var(--alpha-safe-bottom))+4.5rem)] z-dialog max-h-[50dvh] overflow-y-auto shadow-md"
          text={(
            <>
              {credits.state.copyrightShown ? credits.state.copyright : coverage?.available ? coverage.attribution : "Map data © OpenStreetMap contributors, OpenFreeMap"}
              {coverage?.available && <><br />{`Searches and route points go to ${coverage.disclosure.recipients.map((r) => `${r.name} (${r.operator})`).join(", ")} through Alpha Cloud, which keeps only the kind of each request and its result.`}</>}
            </>
          )}
          actions={<MapsPillButton tone="fill" size="md" onClick={() => void credits.send({ type: "closeInfo" })}>Close</MapsPillButton>} />
      )}

      {now === "Search" && <SearchSheet screen={screen} state={state} seen={seen} store={store} saved={saved} height={sheetHeights[state.sheet]} onRecent={setTyped} />}
      {now === "Place" && spot !== undefined && <PlaceSheet key={`${state.link.account}:${state.place}`} screen={screen} state={state} spot={spot} kept={kept} coverage={coverage} height={cardHeight} back={back} />}
      {now === "Directions" && <DirectionsSheet screen={screen} state={state} seen={seen} way={way} height={cardHeight} />}
      {now === "Navigating" && spot !== undefined && <GuidanceFooter screen={screen} state={state} seen={seen} spot={spot} way={way} />}

      {(state.notice !== "NoNotice" || state.copyNotice !== "Uncopied") && (
        <p role="status" className="absolute inset-x-5 bottom-[calc(max(var(--alpha-dock-overlap,0px),var(--alpha-safe-bottom))+5.5rem)] z-toast rounded-full bg-foreground px-4 py-3 text-center text-sm text-background shadow-md">
          {state.notice !== "NoNotice" ? notices[state.notice] : copies[state.copyNotice]}
        </p>
      )}
    </section>
  );
}

/** The search sheet: the recent searches and saved places before typing, then the places found. */
function SearchSheet({ screen, state, seen, store, saved, height, onRecent }: { screen: Screen; state: State; seen: Seen; store: AtlasStore; saved: Kept[]; height: number | string; onRecent: (query: string) => void }) {
  const { can, send } = screen;
  const nextSheet = sheetOrder[(sheetOrder.indexOf(state.sheet) + 1) % sheetOrder.length] ?? "Half";
  const grabLabel = nextSheet === "Full" ? "Raise the search" : nextSheet === "Half" ? "Show half the search" : "Lower the search";
  return (
    <MapsSheet aria-label="Search results" height={height} className="z-sheet">
      <SheetGrabber screen={screen} sheet={state.sheet} label={grabLabel} />
      <div className={cn("min-h-0 flex-1 touch-pan-y overflow-y-auto", dockClearance)}>
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
              {can({ type: "clearRecent" }) && <button type="button" aria-label="Clear recent searches" className={cn(focusRing, "min-h-12 rounded-md px-2 text-sm font-semibold text-primary")} onClick={() => void send({ type: "clearRecent" })}>Clear</button>}
            </div>
            {state.recent.map((query) => (
              <button key={query} type="button" aria-label={`Search ${query}`} disabled={!can({ type: "search", query, chars: query.length })}
                className={cn(focusRing, "flex min-h-12 w-full items-center gap-3.5 px-5 py-1 text-left active:bg-accent")}
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
          const found = store.spot(place);
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
function PlaceSheet({ screen, state, spot, kept, coverage, height, back }: { screen: Screen; state: State; spot: Spot; kept: Kept | undefined; coverage: Coverage | undefined; height: number | string; back: (() => void) | undefined }) {
  const [name, setName] = useState("");
  const { can, send } = screen;
  const saveName = kept?.name ?? spot.name;
  const subtitle = kept !== undefined ? "Saved on this device" : spot.id === "" ? "Selected location" : spot.category;
  const inside = !coverage?.available || coverage.regions.some(({ bounds: [west, south, east, north] }) => {
    const at = degreesOf(spot.at);
    const lng = normalizeLng(at.lng);
    return lng >= west && lng <= east && at.lat >= south && at.lat <= north;
  });
  return (
    <MapsSheet aria-label={saveName} height={height} className="z-sheet">
      <SheetGrabber screen={screen} sheet={state.sheet} label="Resize place sheet" />
      <div className={cn("min-h-0 flex-1 touch-pan-y overflow-y-auto px-5", dockClearance)}>
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-3xl font-light break-words">{saveName}</h2>
            {can({ type: "startRenaming" }) && <button type="button" aria-label="Rename place" className={cn(focusRing, "min-h-12 rounded-md text-primary")} onClick={() => void send({ type: "startRenaming" })}>Rename</button>}
            {subtitle !== "" && <div className="mt-1.5 text-sm leading-tight text-muted-foreground">{subtitle}</div>}
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
            {can({ type: "handOn", kind: "Call" }) && <button type="button" aria-label={`Call ${spot.phone}`} className={cn(focusRing, "min-h-12 rounded-md px-3 font-semibold text-primary")} onClick={() => void send({ type: "handOn", kind: "Call" })}>Call</button>}
            {can({ type: "handOn", kind: "CopyNumber" }) && <button type="button" aria-label="Copy phone number" className={cn(focusRing, "min-h-12 rounded-md px-3 font-semibold text-primary")} onClick={() => void send({ type: "handOn", kind: "CopyNumber" })}>Copy</button>}
          </div>
        )}
        {state.renaming && can({ type: "namePlace", name: name.trim() || saveName }) && (
          <form className="mt-3.5 flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); void send({ type: "namePlace", name: name.trim() || saveName }); setName(""); }}>
            <Input aria-label="Place name" placeholder={saveName} maxLength={300} value={name} onChange={(event) => setName(event.target.value)}
              className="h-11 min-w-0 flex-1 rounded-full border-0 bg-secondary px-3.5" />
            <MapsPillButton tone="fill" size="md" type="submit" aria-label="Apply place name">Done</MapsPillButton>
            {can({ type: "goBack" }) && <MapsPillButton tone="fill" size="md" type="button" onClick={() => { setName(""); void send({ type: "goBack" }); }}>Cancel</MapsPillButton>}
          </form>
        )}
        {coverage?.available && saysOutsideCoverage(state, inside) && <p className="mt-2 text-sm text-muted-foreground">{`This location is outside ${coverage.sources.data} coverage.`}</p>}
        {!hasRoom(state.saved, state.place) && !googleShown(state) && kept === undefined && <p className="mt-2 text-sm text-muted-foreground">Saved places are full. Remove one before adding another.</p>}
        {can({ type: "returnToEvent" }) && <MapsPillButton tone="fill" size="sm" className="mt-2 gap-1 self-start pr-3.5 pl-2 text-sm" onClick={() => void send({ type: "returnToEvent" })}><ChevronLeft aria-hidden />Event</MapsPillButton>}
      </div>
    </MapsSheet>
  );
}

/** The card over the top of the map in directions: where from, where to, and how to travel. */
function DirectionsCard({ screen, state, seen, store, spot, kept, saved, coverage, way, back }: { screen: Screen; state: State; seen: Seen; store: AtlasStore; spot: Spot; kept: Kept | undefined; saved: Kept[]; coverage: Coverage | undefined; way: Way | undefined; back: (() => void) | undefined }) {
  const [start, setStart] = useState("");
  const { can, send } = screen;
  const startAt = pointIn(start);
  const canSearchOrigin = can({ type: "findOrigin", query: "start" });
  const canPlanCoords = can({ type: "planFrom", origin: "Coordinates", lat: 0, lng: 0 });
  const canLocate = can({ type: "useMyLocation" });
  const startFrom = () => {
    if (startAt !== undefined && can({ type: "planFrom", origin: "Coordinates", lat: startAt.lat, lng: startAt.lng })) {
      return void send({ type: "planFrom", origin: "Coordinates", lat: startAt.lat, lng: startAt.lng });
    }
    if (startAt === undefined && can({ type: "findOrigin", query: start.trim() })) void send({ type: "findOrigin", query: start.trim() });
  };
  const starts = state.originsFound > 0 ? seen.origins.slice(0, state.originsFound).flatMap((place) => {
    const found = store.spot(place);
    return found === undefined || place === state.place ? [] : [{ place, name: found.name, spot: found }];
  }) : [];
  const serving = coverage?.available ? coverage.providerId : "";
  const allowedSaved = saved.filter((entry) => servedHere(entry.spot.providerId, serving, state.link.google));
  const typed = start.trim().toLowerCase();
  const options = (typed === "" && starts.length === 0 ? [] : [...starts, ...allowedSaved.filter((entry) => entry.place !== state.place && !starts.some((found) => found.place === entry.place) && entry.name.toLowerCase().includes(typed))])
    .filter((entry) => entry.place !== state.startPlace);
  const from = state.startPlace === 0 ? undefined : store.spot(state.startPlace);
  return (
    <div data-host-chrome="" className="rounded-sheet bg-background pt-1.5 pr-3 pb-3 pl-1 shadow-md ring-1 ring-border motion-safe:animate-drop">
      <div className="flex items-center gap-1">
        <MapsRoundButton tone="plain" size="sm" aria-label="Back to place" disabled={!back} onClick={back}><ChevronLeft /></MapsRoundButton>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {(canSearchOrigin || canPlanCoords || canLocate) && (
            <form className="flex items-center gap-1.5 rounded-lg px-1 focus-within:ring-2 focus-within:ring-ring" onSubmit={(event) => { event.preventDefault(); startFrom(); }}>
              <Input aria-label="Starting point" maxLength={300} value={start} disabled={!canSearchOrigin && !canPlanCoords} onChange={(event) => setStart(event.target.value)}
                placeholder={from?.name ?? (canPlanCoords ? "Place, or latitude, longitude" : "My location")}
                className={cn("h-11 min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 text-body leading-tight", from && "placeholder:text-foreground")} />
              {canLocate && <MapsRoundButton tone="plain" size="sm" aria-label="Use my location" onClick={() => void send({ type: "useMyLocation" })}><LocateFixed /></MapsRoundButton>}
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
function DirectionsSheet({ screen, state, seen, way, height }: { screen: Screen; state: State; seen: Seen; way: Way | undefined; height: number | string }) {
  const { can, send } = screen;
  const alternatives = seen.ways.get(state.trip.route) ?? [];
  return (
    <MapsSheet aria-label="Directions" height={height} className="z-sheet">
      <SheetGrabber screen={screen} sheet={state.sheet} label="Resize directions sheet" />
      <div className={cn("min-h-0 flex-1 touch-pan-y overflow-y-auto px-5", dockClearance)}>
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
              const routeKey = `${state.trip.route}:${option.seconds}:${option.meters}:${option.turns[0]?.instruction ?? ""}:${option.line.length}`;
              return (
                <MapsPillButton key={routeKey} size="md" tone={on ? "accent" : "fill"} className="justify-between" aria-pressed={on}
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
          <details className="mt-3.5">
            <summary className={cn(focusRing, "min-h-12 cursor-pointer content-center rounded-md text-base font-semibold")}>Steps</summary>
            <ol>
              {way.turns.map((step) => (
                <li key={`${state.trip.route}:${state.chosen}:${step.at.lat}:${step.at.lng}:${step.meters}:${step.instruction}`} className="flex justify-between gap-3 border-t border-border py-3 text-sm"><span className="min-w-0">{step.instruction}</span><span className="shrink-0 text-muted-foreground">{distance(step.meters)}</span></li>
              ))}
            </ol>
          </details>
        )}
      </div>
    </MapsSheet>
  );
}

/** Remaining route meters and seconds from the current turn onward. */
function remainingMetrics(way: Way, turnIndex: number, here: Seen["here"]): { readonly metersLeft: number; readonly secondsLeft: number; readonly toTurn: number } {
  const rest = way.turns.slice(turnIndex);
  const current = rest[0];
  const nextTurnPoint = way.turns[turnIndex + 1]?.at ?? way.line.at(-1);
  const toTurn = here !== undefined && nextTurnPoint !== undefined ? meters(here.at, nextTurnPoint) : current?.meters ?? 0;
  const tailMeters = rest.slice(1).reduce((sum, step) => sum + step.meters, 0);
  const metersLeft = Math.max(0, toTurn + tailMeters);
  const ratio = way.meters > 0 ? Math.min(1, metersLeft / way.meters) : 1;
  return { metersLeft, secondsLeft: Math.round(way.seconds * ratio), toTurn };
}

/** Guidance top bar: the next turn in Alpha blue, Recenter when panned, and the upcoming turn pill. */
function GuidanceHeader({ screen, state, seen, spot, kept, way, onRecenter }: { screen: Screen; state: State; seen: Seen; spot: Spot; kept: Kept | undefined; way: Way | undefined; onRecenter: () => void }) {
  const { can, send } = screen;
  const turn = way?.turns[state.trip.turn];
  const after = way?.turns[state.trip.turn + 1];
  const arrived = state.trip.guidance === "Arrived";
  const imprecise = state.imprecise || (seen.here?.approximate ?? false);
  const precise = seen.here !== undefined && !imprecise && !state.trip.rerouting;
  const remaining = way === undefined ? undefined : remainingMetrics(way, state.trip.turn, seen.here);
  return (
    <div className="flex flex-col">
      <div data-host-chrome="" role="status" className="flex items-center gap-4 rounded-sheet bg-alpha px-5 py-4.5 text-alpha-foreground shadow-lg motion-safe:animate-drop">
        {arrived ? <Check aria-hidden className="size-13 shrink-0" /> : <Navigation aria-hidden className="size-13 shrink-0" />}
        <div className="min-w-0 flex-1">
          {!arrived && precise && remaining !== undefined && <div className="font-display text-4xl leading-none font-light">{distance(remaining.toTurn)}</div>}
          <div className="mt-1 truncate text-lead font-semibold">
            {arrived ? (kept?.name ?? spot.name) : seen.here === undefined ? "Waiting for your location." : imprecise ? "Turn guidance needs a precise, up-to-date location." : state.trip.rerouting ? "Finding a new route" : turn?.instruction ?? ""}
          </div>
        </div>
        {can({ type: "recenter" }) && (
          <MapsRoundButton tone="night" size="md" aria-label="Recenter" onClick={() => { onRecenter(); void send({ type: "recenter" }); }}><LocateFixed /></MapsRoundButton>
        )}
      </div>
      {!arrived && after !== undefined && (
        <div className="ml-4 flex h-10 self-start items-center gap-2 rounded-b-lg bg-alpha/90 px-3.5 text-sm font-semibold text-alpha-foreground motion-safe:animate-drop">
          Then<span className="max-w-55 truncate">{after.instruction}</span>
        </div>
      )}
    </div>
  );
}

/** Guidance footer: End navigation and live remaining ETA/distance above the dock. */
function GuidanceFooter({ screen, state, seen, spot, way }: { screen: Screen; state: State; seen: Seen; spot: Spot; way: Way | undefined }) {
  const { can, send } = screen;
  const arrived = state.trip.guidance === "Arrived";
  const remaining = way === undefined ? undefined : remainingMetrics(way, state.trip.turn, seen.here);
  return (
    <>
      {/* eslint-disable-next-line better-tailwindcss/no-unknown-classes -- Guidance stays dark in both themes, as on develop; `dark` is the design system's theme class. */}
      <div data-host-chrome="bottom" className="dark absolute inset-x-3 bottom-[calc(max(var(--alpha-dock-overlap,0px),var(--alpha-safe-bottom))+1rem)] z-sheet flex items-center gap-3 rounded-home-card bg-secondary p-2.5 text-secondary-foreground motion-safe:animate-rise">
        <MapsRoundButton tone="nightFill" size="2xl" aria-label="End navigation" disabled={!can({ type: "endGuidance" })} onClick={() => void send({ type: "endGuidance" })}><X /></MapsRoundButton>
        <div className="min-w-0 flex-1 pr-14 text-center">
          <div className="font-display text-figure-sm font-light">{arrived ? "Arrived" : remaining === undefined ? "" : minutes(remaining.secondsLeft)}</div>
          {remaining !== undefined && <div className="mt-0.75 text-meta leading-tight text-muted-foreground">{arrived ? spot.address : distance(remaining.metersLeft)}</div>}
        </div>
      </div>
    </>
  );
}
