// spec/app/maps/index.md, "Story: Move between the screen's modes"; spec/app/maps/index.md, "Story: Search for a place"; spec/app/maps/index.md, "Story: Look at a place"; spec/app/maps/index.md, "Story: Get directions"; spec/app/maps/index.md, "Story: Navigate"; spec/app/maps/index.md, "Story: Use my location"; spec/app/maps/index.md, "Story: Let the agent help with Maps"; spec/app/maps/credits.md, "Story: See the map for what I am looking at"
import { Alert, cn, Input, type MapCamera, MapsChip, MapsPillButton, MapsPlaceRow, MapsRoundButton, MapsSearchBar, MapsSheet, MapsStatusCard, type MapStyle, MapView, Spinner, Toast, ToastRegion } from "@repo/ui";
import { ArrowUpDown, Bike, Bus, Car, Check, ChevronLeft, Clock, Coffee, Dumbbell, ExternalLink, Footprints, Fuel, Globe, Info, LocateFixed, Lock, type LucideIcon, MapPin, Navigation, Phone, RotateCw, Search, Settings, Share2, ShoppingCart, SquarePlus, Star, Utensils, X } from "lucide-react";
import { type ReactNode, useEffect, useState, useSyncExternalStore } from "react";
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
import { badgeOnly, holding, needsSettings } from "../../gen/app__maps__connection.ts";
import { offers } from "../../gen/app__maps__navigation.ts";
import type { Travel } from "../../gen/app__maps__navigation.ts";
import { hasRoom } from "../../gen/app__maps__places.ts";
import { type Seen, type Spot, type Way, atlas } from "./atlas.vibe";
import { degreesOf, pointIn } from "./geometry.ts";
import googleMaps from "./google-maps-attribution.svg";
import { coverageOf, settled, tile } from "./maps.vibe";
import { handedQuery, takeHandedQuery, watchHandoff } from "./handoff.ts";

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

/** A time as develop writes it: minutes, and hours past the hour. */
const minutes = (seconds: number) => {
  const whole = Math.max(1, Math.round(seconds / 60));
  return whole < 60 ? `${whole} min` : `${Math.floor(whole / 60)} h ${whole % 60} min`;
};
/** A distance as develop writes it: feet and miles in the United States, else 5 m steps below 100 m, 10 m below 1 km, then 0.1 km. */
const distance = (meters: number, locale = Intl.DateTimeFormat().resolvedOptions().locale) => {
  if (/^en-US\b/i.test(locale)) {
    const feet = meters / 0.3048;
    return feet < 1000 ? `${Math.round(feet / 10) * 10} ft` : `${(meters / 1609.344).toFixed(1)} mi`;
  }
  if (meters < 100) return `${Math.max(0, Math.round(meters / 5) * 5)} m`;
  return meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`;
};
/** How far apart two points are along the earth, in meters. */
const apart = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = Math.PI / 180;
  const h = Math.sin(((a.lat - b.lat) * r) / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((a.lng - b.lng) * r) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
};

/** How a place is named on screen: a dropped pin, named by its coordinates, is "Selected location", as on develop. */
const shown = (name: string) => (pointIn(name) === undefined ? name : "Selected location");

/** A place's title: a pin not yet saved is "Dropped pin", as v119 named it (ui/maps/maps-screen.ts:658). */
const titleOf = (spot: Spot, kept: Kept | undefined) => (kept === undefined && spot.id === "" && pointIn(spot.name) !== undefined ? "Dropped pin" : shown(kept?.name ?? spot.name));

/** Where a place's pin stands above the centre: in the middle of the map left between the search field and the credits, as v119 placed it (maps/map-plane.ts:586-593, 770-776). */
const liftOver = (bottom: number) => Math.max(0, (bottom + 46 - 100) / 2);

/** Where the world map first stands: North America, as develop opens it. */
const northAmerica = { lat: 45, lng: -98 };

/** develop's 24px stroke icon of each manoeuvre a provider names; a step with none goes straight on. */
const manoeuvres: Record<string, string> = {
  depart: "M12 20V4M6 10l6-6 6 6", continue: "M12 20V4M6 10l6-6 6 6",
  "slight-left": "M15 21v-7L8 7M8 13V7h6", left: "M18 21v-8a3 3 0 0 0-3-3H5M9 6l-4 4 4 4", "sharp-left": "M17 21V8L7 18M7 12v6h6",
  "slight-right": "M9 21v-7l7-7M16 13V7h-6", right: "M6 21v-8a3 3 0 0 1 3-3h10M15 6l4 4-4 4", "sharp-right": "M7 21V8l10 10M17 12v6h-6",
  "keep-left": "M15 21v-6c0-2-1-3-3-5L8 6M8 11V6h5", "keep-right": "M9 21v-6c0-2 1-3 3-5l4-4M16 11V6h-5",
  "u-turn": "M8 21V9a4 4 0 0 1 8 0v5M13 11l3 3 3-3", roundabout: "M12 21v-5M12 16a4 4 0 1 1 4-4M16 12V6M13 9l3-3 3 3",
  arrive: "M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0zM15 10a3 3 0 1 1-6 0a3 3 0 1 1 6 0z",
};

/** The icon of a manoeuvre, drawn as develop draws it. */
function Manoeuvre({ maneuver, className }: { maneuver: string | undefined; className: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={cn("shrink-0 fill-none stroke-current stroke-2", className)} strokeLinecap="round" strokeLinejoin="round">
      <path d={manoeuvres[maneuver ?? "continue"] ?? manoeuvres.continue} />
    </svg>
  );
}

/** The status card clears the search field or the route controls above it. */
const statusTop: Record<string, string> = {
  Browse: "top-32.5 in-data-[alpha-launcher]:top-43.5", Search: "top-21.5 in-data-[alpha-launcher]:top-32.5",
  Place: "top-21 in-data-[alpha-launcher]:top-32", Directions: "top-58", Navigating: "top-47 in-data-[alpha-launcher]:top-58",
};

// spec/app/maps/credits.md, "The camera goes to what the owner picked, on every map"
/** Where the camera goes for `state`, named so the map applies each aim once. */
function cameraOf(state: State, seen: Seen, following: boolean, bottom: number): MapCamera {
  const way = atlas.way(state.trip.route, state.chosen);
  const spot = atlas.spot(state.place);
  const results = state.place === 0 && state.search.status === "Loaded" ? seen.results.slice(0, state.results) : [];
  const aim = cameraAim(following, way !== undefined, true, spot !== undefined, true, true, results.length);
  if (aim === "FollowPhone" && seen.here !== undefined) return { kind: "follow", key: `here:${seen.here.at.lat}:${seen.here.at.lng}`, at: degreesOf(seen.here.at) };
  if (aim === "FitRoute" && way !== undefined) return { kind: "fit", key: `route:${state.trip.route}`, points: way.line.map(degreesOf), maxZoom: routeMaxZoom };
  if (aim === "CenterOnPlace" && spot !== undefined) return { kind: "centre", key: `place:${state.place}`, at: degreesOf(spot.at), zoom: placeZoom, lift: liftOver(bottom) };
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
  const [whyAsked, setWhyAsked] = useState(false);
  const { state, can, send } = screen;
  const handed = useSyncExternalStore(watchHandoff, handedQuery, handedQuery);
  const handOver = handed === undefined ? undefined : { type: "handOver", query: handed, chars: handed.length } as const;
  // spec/app/maps/index.md, "A query another app hands to Maps opens as a search, never over navigation": a search not taken is dropped when Maps leaves
  useEffect(() => () => { takeHandedQuery(); }, []);
  useEffect(() => {
    if (handOver === undefined || !can(handOver) || can({ type: "continueDisclosure" })) return;
    takeHandedQuery();
    setTyped(handOver.query);
    void send(handOver);
  }, [can, handOver, send, state]);
  if (screen.cause) return <Alert variant="destructive" className="m-4">Alpha could not open Maps</Alert>;
  const info = credits.state;
  if (!state || !info) return null;
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
  // spec/app/maps/index.md, "Story: Search for a place"
  const clear = () => {
    typing("");
    if (can({ type: "search", query: "", chars: 0 })) void send({ type: "search", query: "", chars: 0 });
  };
  // spec/app/maps/index.md, "Story: Search for a place": the field's Clear on a place leaves it for an empty search, as v119's clearQuery did (ui/maps/maps-screen.ts:612-624)
  const clearPlace = () => {
    setTyped("");
    void send({ type: "goBack" }).then(() => send({ type: "search", query: "", chars: 0 }));
  };
  const cardHeight = now === "Place" ? (spot?.phone === undefined ? 400 : 452) : now === "Directions" ? 300 + 50 * (seen.ways.get(state.trip.route) ?? []).length : 0;
  const floatBottom = (now === "Search" ? (state.sheet === "Peek" ? 250 : 520) : cardHeight || 110) + 14;
  const back = offer(screen, { type: "goBack" });
  const opened = offer(screen, { type: "openSearch" });
  const openSearch = opened && (() => { setTyped(""); opened(); });
  const leave = back && (() => { if (now === "Search") setTyped(""); back(); });
  const placeName = spot === undefined ? "" : titleOf(spot, kept);
  const inside = spot === undefined || !coverage?.available || coverage.regions.some(({ bounds: [west, south, east, north] }) => {
    const at = degreesOf(spot.at);
    return at.lng >= west && at.lng <= east && at.lat >= south && at.lat <= north;
  });
  const retryMap = offer(screen, { type: "retryMap" });
  const refused = now === "Browse" && needsSettings(state.link);
  const myLocation = offer(screen, { type: "useMyLocation" });
  const disclosable = can({ type: "continueDisclosure" }) && myLocation === undefined;
  // spec/app/maps/connection.md, "The owner reads Alpha's location disclosure before Android asks": Recenter is always shown, as on v119 (template.html:2407-2408), and its first tap shows the disclosure
  const locate = myLocation ?? (disclosable ? () => setWhyAsked(true) : undefined);
  const disclosing = disclosable && whyAsked && now !== "Navigating";
  // spec/app/maps/index.md, "Story: Use my location": every state Maps reports stands in one card under the search field, as on develop.
  const said: string[] = [
    ...(disclosing ? ["Maps uses your location to show where you are and to plan routes from it. Searches and route points go to the Maps provider; your agent is never told where you are."] : []),
    ...(retryMap ? ["Map rendering is unavailable. Retry the map or open a saved place."] : []),
    ...(refused ? ["Location permission was not granted. You can choose an origin manually.", "Allow location in Settings to show your position."] : []),
    ...(state.link.coverage.status === "Failed" && !holding(state.link) ? ["Maps could not be reached."] : []),
    ...(holding(state.link) ? [`Maps request limit reached. Try again in ${Math.max(1, Math.ceil(state.link.held / 60))} minutes.`] : []),
    ...(state.link.known && state.link.account === 0 ? ["Sign in to Alpha Cloud to use Maps."] : []),
    ...(!state.keepable ? ["Saved places could not be read. Existing data has not been replaced."] : []),
    ...(now === "Place" && coverage?.available && saysOutsideCoverage(state, inside) ? [`This location is outside ${coverage.sources.data} coverage.`] : []),
    ...(now === "Search" && state.search.status === "Failed" && !holding(state.link) ? ["The search failed."] : []),
    ...(state.guideNotice === "Quiet" ? [] : [told[state.guideNotice]]),
    ...(state.notice === "NoNotice" ? [] : [notices[state.notice]]),
  ];
  const statusActions: ReactNode[] = [
    disclosing && <MapsPillButton key="continue" className="text-sm font-normal" onClick={() => void send({ type: "continueDisclosure" })}>Continue</MapsPillButton>,
    (retryMap || refused) && myLocation && <MapsPillButton key="here" className="text-sm font-normal" onClick={myLocation}>My location</MapsPillButton>,
    refused && myLocation && <MapsPillButton key="settings" tone="fill" aria-label="Location settings" className="gap-1.5 px-3 text-sm font-normal [&_svg]:size-4.5" onClick={myLocation}><Settings aria-hidden />Settings</MapsPillButton>,
    retryMap && <MapsPillButton key="map" tone="fill" aria-label="Retry map" className="gap-1.5 px-3 text-sm font-normal [&_svg]:size-4.5" onClick={retryMap}><RotateCw aria-hidden />Retry</MapsPillButton>,
    state.link.coverage.status === "Failed" && !holding(state.link) && can({ type: "connect" }) && <MapsPillButton key="connect" tone="fill" className="gap-1.5 px-3 text-sm font-normal [&_svg]:size-4.5" onClick={() => void send({ type: "connect" })}><RotateCw aria-hidden />Retry</MapsPillButton>,
  ].filter(Boolean);
  const infoShown = !badgeOnly(state.link) && coverage?.available === true;
  return (
    <section aria-label="Maps" className="relative isolate flex flex-1 flex-col overflow-hidden">
      <MapView
        className="absolute inset-0 h-full rounded-none"
        zoomControls={false}
        opening={{ at: northAmerica, zoom: style.kind === "raster" ? 2 : 2.4 }}
        compassBottom={now === "Navigating" ? 198 : floatBottom + 60}
        label={spot === undefined ? "Map" : `Map of ${placeName}`}
        surface={state.link.plane}
        style={style}
        pins={pins}
        here={seen.here === undefined ? undefined : degreesOf(seen.here.at)}
        line={way?.line.map(degreesOf)}
        camera={cameraOf(state, seen, following, floatBottom)}
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
          onLead={now === "Browse" ? openSearch : leave}
          aria-label="Search Maps"
          placeholder="Search"
          maxLength={300}
          value={now === "Place" ? typed || placeName : now === "Search" ? typed : ""}
          readOnly={now === "Place"}
          onFocus={openSearch}
          onChange={(event) => typing(event.target.value)}
          onSubmit={submit}
          onClear={typed === "" ? undefined : now === "Search" ? clear : now === "Place" && back ? clearPlace : undefined}
        />
      )}
      {(now === "Directions" || now === "Navigating") && (
        <div data-host-chrome="" className={cn("absolute top-0 left-3 z-10 in-data-[alpha-launcher]:hidden [&_button]:size-11", now === "Navigating" && "[&_button]:rounded-full [&_button]:bg-background")}><AppBack alpha={alpha} /></div>
      )}

      {now === "Browse" && saved.length > 0 && (
        <nav aria-label="Saved places" className="absolute inset-x-0 top-18 z-10 flex touch-pan-x gap-2 overflow-x-auto px-3 pb-2.5 [scrollbar-width:none] in-data-[alpha-launcher]:top-29">
          {saved.map((entry) => (
            <MapsChip key={entry.place} label={shown(entry.name)} icon={<MapPin />} disabled={!can({ type: "pickSaved", place: entry.place })} onClick={offer(screen, { type: "pickSaved", place: entry.place })} />
          ))}
        </nav>
      )}
      {(now === "Browse" || now === "Search" || now === "Place") && can({ type: "returnToEvent" }) && (
        <button type="button" aria-label="Back to event" onClick={() => void send({ type: "returnToEvent" })}
          className="absolute top-17.5 left-3 z-10 flex h-10 items-center gap-1 rounded-full bg-background pr-3.5 pl-2 text-sm font-semibold shadow-float ring-1 ring-border active:bg-accent dark:shadow-float-dark in-data-[alpha-launcher]:top-28.5 [&_svg]:size-4.5">
          <ChevronLeft aria-hidden />Event
        </button>
      )}

      {now === "Directions" && spot !== undefined && <DirectionsCard screen={screen} state={state} seen={seen} spot={spot} kept={kept} saved={saved} back={back} locate={locate} />}
      {now === "Navigating" && spot !== undefined && <Guidance screen={screen} state={state} seen={seen} spot={spot} kept={kept} way={way} />}

      {state.question !== "NoQuestion" && state.review.showing && (
        <div className="pointer-events-none absolute inset-x-3 top-17 z-10 flex flex-col gap-2 *:pointer-events-auto in-data-[alpha-launcher]:top-28">
          <MapsStatusCard role="dialog" aria-label={state.question === "ReadPlace" ? "Share this place with your agent" : "Start this route"}
            text={state.question === "ReadPlace" ? `Your agent asks to read ${placeName || "this place"}.` : `Your agent proposes this route to ${placeName || "this place"}.`}
            actions={(
              <>
                {can({ type: "approve" }) && <MapsPillButton size="lg" onClick={() => void send({ type: "approve" })}>{state.question === "ReadPlace" ? "Share" : "Start"}</MapsPillButton>}
                {can({ type: "decline" }) && <MapsPillButton tone="fill" size="lg" onClick={() => void send({ type: "decline" })}>Not now</MapsPillButton>}
              </>
            )} />
        </div>
      )}

      {said.length > 0 && (
        <MapsStatusCard role={disclosing ? "dialog" : "status"} aria-label={disclosing ? "Location" : "Maps status"}
          className={cn("absolute inset-x-5 z-10 max-h-[calc(100%-240px)] overflow-y-auto", statusTop[now])}
          text={said.map((line, index) => <span key={line} className={cn("block", index > 0 && "mt-1.5")}>{line}</span>)}
          actions={statusActions.length > 0 ? statusActions : undefined} />
      )}

      {now !== "Navigating" && locate && !(now === "Search" && state.sheet === "Full") && (
        <MapsRoundButton tone="float" size="md" aria-label="Recenter" className="absolute right-4 z-10 transition-[bottom] duration-slow ease-standard" style={{ bottom: `min(${floatBottom}px, calc(100% - 176px))` }} onClick={locate}><LocateFixed /></MapsRoundButton>
      )}
      {now === "Navigating" && can({ type: "recenter" }) && (
        <MapsRoundButton tone="night" size="xl" aria-label="Recenter" className="absolute right-4 bottom-34 z-10" onClick={() => void send({ type: "recenter" })}><LocateFixed /></MapsRoundButton>
      )}
      {now !== "Navigating" && !(now === "Search" && state.sheet === "Full") && (
        <div className="absolute right-19 left-4 z-10 flex items-center gap-2 text-xs leading-normal text-foreground transition-[bottom] duration-slow ease-standard" style={{ bottom: floatBottom }}>
          {badgeOnly(state.link)
            ? credits.can({ type: "openInfo" }) && <button type="button" aria-label="Google Maps" onClick={() => void credits.send({ type: "openInfo" })}><img src={googleMaps} alt="Google Maps" width={98} height={18} /></button>
            : (
              <span className="min-w-0 flex-1 rounded-md bg-background px-2 py-1.5 wrap-anywhere shadow-credit dark:shadow-credit-dark [&_a]:underline">
                {style.kind === "raster"
                  ? coverage?.available ? coverage.attribution : null
                  : <><a href="https://openfreemap.org/" target="_blank" rel="noopener noreferrer">OpenFreeMap</a> · <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener noreferrer">© OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>{coverage?.available && coverage.attribution !== "" && ` · ${coverage.attribution}`}</>}
              </span>
            )}
          {infoShown && (credits.can({ type: "openInfo" }) || info.infoOpen) && (
            <div className="relative -order-1 shrink-0">
              <MapsRoundButton tone="float" size="md" aria-label="Map credits" aria-expanded={info.infoOpen}
                onClick={() => void credits.send({ type: info.infoOpen ? "closeInfo" : "openInfo" })}><Info className="size-5" /></MapsRoundButton>
              {info.infoOpen && (
                <div role="dialog" aria-label="Map credits" className="absolute bottom-[calc(100%+10px)] left-0 z-50 grid max-h-60 w-[min(300px,calc(100vw-32px))] gap-2.5 overflow-y-auto rounded-xl bg-background px-4 py-3.5 text-sm leading-snug wrap-anywhere text-foreground shadow-float ring-1 ring-border dark:shadow-float-dark">
                  <p className="flex items-center gap-2"><Lock aria-hidden className="size-4 shrink-0" />Routes share selected points</p>
                  <p>{`${coverage.disclosure.recipients.map((r) => `${r.name} (${r.operator})`).join(", ")} receive searches and route points through Alpha Cloud, which keeps only the kind of each request and its result.`}</p>
                  {info.copyrightShown && <p className="text-xs text-muted-foreground">{info.copyright}</p>}
                </div>
              )}
            </div>
          )}
          {badgeOnly(state.link) && info.infoOpen && (
            <div role="dialog" aria-label="Map credits" className="absolute bottom-[calc(100%+10px)] left-0 z-50 grid max-h-60 w-[min(300px,calc(100vw-32px))] gap-2.5 overflow-y-auto rounded-xl bg-background px-4 py-3.5 text-sm leading-snug wrap-anywhere text-foreground shadow-float ring-1 ring-border dark:shadow-float-dark">
              <p>{info.copyrightShown ? info.copyright : coverage?.available ? coverage.attribution : ""}</p>
              {coverage?.available && <p className="flex items-center gap-2"><Lock aria-hidden className="size-4 shrink-0" />Routes share selected points</p>}
            </div>
          )}
        </div>
      )}

      {state.copyNotice !== "Uncopied" && <ToastRegion><Toast>{copies[state.copyNotice]}</Toast></ToastRegion>}

      {now === "Search" && <SearchSheet screen={screen} state={state} seen={seen} saved={saved} height={sheetHeights[state.sheet]} onRecent={setTyped} />}
      {now === "Place" && spot !== undefined && <PlaceSheet screen={screen} state={state} spot={spot} kept={kept} height={cardHeight} back={back} outside={saysOutsideCoverage(state, inside)} />}
      {now === "Directions" && <DirectionsSheet screen={screen} state={state} way={way} alternatives={seen.ways.get(state.trip.route) ?? []} height={cardHeight} />}
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
        {state.search.status === "Loading" && <p role="status" className="sr-only">Searching</p>}
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
                <Clock aria-hidden className="size-5 shrink-0 text-muted-foreground" /><span className="truncate text-md">{query}</span>
              </button>
            ))}
          </div>
        )}
        {state.query === "" && saved.map((entry) => (
          <MapsPlaceRow key={entry.place} aria-label={entry.name} name={shown(entry.name)} icon={<MapPin />}
            disabled={!can({ type: "pickSaved", place: entry.place })} onClick={() => void send({ type: "pickSaved", place: entry.place })} />
        ))}
        {seen.results.slice(0, state.results).map((place) => {
          const found = atlas.spot(place);
          return found && (
            <MapsPlaceRow key={place} aria-label={found.name} name={shown(found.name)} icon={<MapPin />}
              detail={[seen.here === undefined ? "" : distance(apart(degreesOf(seen.here.at), degreesOf(found.at))), found.address ?? "Selected location"].filter(Boolean).join(" · ")}
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
function PlaceSheet({ screen, state, spot, kept, height, back, outside }: { screen: Screen; state: State; spot: Spot; kept: Kept | undefined; height: number; back: (() => void) | undefined; outside: boolean }) {
  const [name, setName] = useState("");
  const { can, send } = screen;
  const saveName = kept?.name ?? spot.name;
  const pinned = spot.id === "" && pointIn(spot.name) !== undefined;
  return (
    <MapsSheet aria-label={titleOf(spot, kept)} height={height} grows className="px-5 pt-4.5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-3xl font-light break-words">{titleOf(spot, kept)}</h2>
          {can({ type: "startRenaming" }) && <button type="button" aria-label="Rename place" className="min-h-12 px-3 text-primary" onClick={() => { setName(saveName); void send({ type: "startRenaming" }); }}>Rename</button>}
          <div className="mt-1.5 text-sm text-muted-foreground">{pinned ? "Selected location" : spot.category || "Place"}</div>
          {spot.hours !== undefined && <div className="mt-1 text-sm"><span className="font-semibold">Hours</span><span className="text-muted-foreground">{` · ${spot.hours}`}</span></div>}
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
        {outside && can({ type: "handOn", kind: "MapsApp" }) && <MapsRoundButton aria-label="Open in another app" onClick={() => void send({ type: "handOn", kind: "MapsApp" })}><ExternalLink /></MapsRoundButton>}
      </div>
      <div className="mt-5 flex items-center gap-2.5 text-sm text-muted-foreground"><MapPin aria-hidden className="size-4.5 shrink-0" />{spot.address ?? "Selected location"}</div>
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
      {!hasRoom(state.saved, state.place) && !googleShown(state) && kept === undefined && <p className="mt-2 text-sm text-muted-foreground">Saved places are full. Remove one before adding another.</p>}
    </MapsSheet>
  );
}

/** The card over the top of the map in directions: where from, where to, and how to travel. */
function DirectionsCard({ screen, state, seen, spot, kept, saved, back, locate }: { screen: Screen; state: State; seen: Seen; spot: Spot; kept: Kept | undefined; saved: Kept[]; back: (() => void) | undefined; locate: (() => void) | undefined }) {
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
  const swappable = can({ type: "swapEnds", lat: spot.at.lat, lng: spot.at.lng });
  return (
    <div data-host-chrome="" className="absolute inset-x-3 top-13 z-10 rounded-group bg-background pt-1.5 pr-3 pb-3 pl-1 shadow-float ring-1 ring-border motion-safe:animate-drop dark:shadow-float-dark">
      <div className="flex items-center gap-1">
        <MapsRoundButton tone="plain" size="sm" aria-label="Back to place" disabled={!back} onClick={back}><ChevronLeft /></MapsRoundButton>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {can({ type: "findOrigin", query: "start" }) && (
            <form className="flex items-center gap-1.5" onSubmit={(event) => { event.preventDefault(); startFrom(); }}>
              <Input aria-label="Starting point" maxLength={300} value={start} onChange={(event) => setStart(event.target.value)}
                placeholder={from === undefined ? "My location" : shown(from.name)}
                className="h-11.5 min-w-0 flex-1 rounded-none border-0 bg-transparent px-0.5 text-body placeholder:text-foreground focus-visible:outline-none" />
              {locate && <MapsRoundButton tone="plain" size="sm" aria-label="Use my location" onClick={locate}><LocateFixed /></MapsRoundButton>}
            </form>
          )}
          <div className="flex h-8 items-center gap-3 text-md font-semibold"><MapPin aria-hidden className="size-4.5 text-primary" /><span className="truncate">{titleOf(spot, kept)}</span></div>
        </div>
        <MapsRoundButton tone="plain" aria-label="Swap starting point and destination" aria-disabled={!swappable} className="size-12 aria-disabled:pointer-events-auto aria-disabled:opacity-40"
          onClick={swappable ? () => void send({ type: "swapEnds", lat: spot.at.lat, lng: spot.at.lng }) : undefined}><ArrowUpDown /></MapsRoundButton>
      </div>
      {state.origins.status === "Loading" && <Spinner className="mt-2 ml-2" label="Finding the starting point" />}
      {state.origins.status === "Loaded" && state.originsFound === 0 && <p className="mt-2 ml-2 text-sm text-muted-foreground">No starting point found.</p>}
      {options.map((entry) => can({ type: "startFrom", place: entry.place, lat: entry.spot.at.lat, lng: entry.spot.at.lng }) && (
        <MapsPlaceRow key={entry.place} className="px-2" aria-label={`From ${entry.name}`} name={shown(entry.name)} icon={<MapPin />} onClick={() => { setStart(""); void send({ type: "startFrom", place: entry.place, lat: entry.spot.at.lat, lng: entry.spot.at.lng }); }} />
      ))}
      <div role="group" aria-label="Travel mode" className="mt-2 ml-2 flex flex-wrap gap-1.5">
        {ways.map(({ travel, label, icon: Icon }) => {
          const on = state.trip.travel === travel;
          const offered = on || (offers(state.link.offer, travel) && can({ type: "chooseTravel", travel }));
          return (
            <MapsPillButton key={travel} size="sm" tone={on ? "accent" : "fill"} className="min-w-max flex-1 gap-1.25" aria-label={label} aria-pressed={on} aria-disabled={!offered}
              onClick={on || !offered ? undefined : () => void send({ type: "chooseTravel", travel })}>
              <Icon aria-hidden />{label}
            </MapsPillButton>
          );
        })}
      </div>
      {can({ type: "returnToEvent" }) && (
        <MapsPillButton tone="fill" size="sm" aria-label="Back to event" className="mt-2 ml-2 gap-1 pr-3.5 pl-2 text-sm" onClick={() => void send({ type: "returnToEvent" })}><ChevronLeft aria-hidden />Event</MapsPillButton>
      )}
    </div>
  );
}

/** The directions sheet: the route's time and length, the routes to choose from, Start and its steps. */
function DirectionsSheet({ screen, state, way, alternatives, height }: { screen: Screen; state: State; way: Way | undefined; alternatives: readonly Way[]; height: number }) {
  const { can, send } = screen;
  const from = state.startPlace === 0 ? undefined : atlas.spot(state.startPlace);
  return (
    <MapsSheet aria-label="Directions" height={height} grows className="px-5 pt-5.5">
      <div role={way === undefined ? "status" : undefined} className="flex items-baseline gap-3">
        <span className="font-display text-figure font-light">{way !== undefined ? minutes(way.seconds) : state.trip.plan.status === "Loading" ? "Planning…" : "No route"}</span>
        {way !== undefined && <span className="text-base text-muted-foreground">{`${distance(way.meters)}${way.live === true ? "" : " · no live traffic"}`}</span>}
      </div>
      <div className="mt-2 text-sm text-muted-foreground">{way === undefined ? "Choose a starting point to see a route." : `${from === undefined ? "" : `From ${shown(from.name)} · `}${way.turns[0]?.instruction ?? ""}`}</div>
      {alternatives.length > 0 && (
        <fieldset aria-label="Routes" className="mt-3.5 flex min-w-0 flex-col gap-1.5">
          {alternatives.map((option, index) => {
            const on = index === state.chosen;
            return (
              <MapsPillButton key={`${option.seconds} ${option.meters} ${option.turns.length}`} size="md" tone={on ? "accent" : "fill"} className="justify-between" aria-pressed={on}
                aria-label={`${index === 0 ? "Recommended" : `Alternative ${index}`}, ${minutes(option.seconds)}, ${distance(option.meters)}`}
                disabled={!on && !can({ type: "chooseRoute", index, turns: Math.max(1, option.turns.length) })}
                onClick={on ? undefined : () => void send({ type: "chooseRoute", index, turns: Math.max(1, option.turns.length) })}>
                <span>{index === 0 ? "Recommended" : `Alternative ${index}`}</span><span>{`${minutes(option.seconds)} · ${distance(option.meters)}`}</span>
              </MapsPillButton>
            );
          })}
        </fieldset>
      )}
      <div className="mt-5 flex shrink-0 gap-2">
        <MapsPillButton size="xl" className="flex-1" disabled={!can({ type: "startGuidance" })} onClick={() => void send({ type: "startGuidance" })}><Navigation aria-hidden className="fill-current" />Start</MapsPillButton>
        {can({ type: "handOn", kind: "EtaShare" }) && <MapsRoundButton size="2xl" aria-label="Share route" onClick={() => void send({ type: "handOn", kind: "EtaShare" })}><Share2 /></MapsRoundButton>}
      </div>
      {way !== undefined && way.turns.length > 0 && (
        <details className="mt-3.5 shrink-0">
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
  const [startedAt] = useState(Date.now);
  return (
    <>
      <div data-host-chrome="" role="status" className="absolute inset-x-3 top-12.5 z-50 flex items-center gap-4 rounded-sheet bg-alpha px-5 py-4.5 text-alpha-foreground shadow-banner motion-safe:animate-drop in-data-[alpha-launcher]:top-23.5">
        {arrived ? <Check aria-hidden className="size-13 shrink-0" /> : <Manoeuvre maneuver={turn?.maneuver} className="size-13" />}
        <div className="min-w-0">
          <div className="font-display text-figure-lg font-light">{arrived ? "Arrived" : precise && turn !== undefined ? distance(turn.meters) : state.trip.rerouting ? "Rerouting…" : "Locating…"}</div>
          <div className="mt-1 truncate text-lead font-semibold">
            {arrived ? titleOf(spot, kept) : seen.here === undefined ? "Waiting for your location" : seen.here.approximate ? "Turn guidance needs a precise location" : state.trip.rerouting ? "Finding a new route" : turn?.instruction ?? ""}
          </div>
        </div>
      </div>
      {!arrived && after !== undefined && (
        <div className="absolute top-39.5 left-7 z-10 flex h-10 items-center gap-2 rounded-b-lg bg-alpha-deep px-3.5 text-sm font-semibold text-alpha-foreground in-data-[alpha-launcher]:top-50.5">
          Then<Manoeuvre maneuver={after.maneuver} className="size-5" /><span className="max-w-55 truncate">{after.instruction}</span>
        </div>
      )}
      {/* eslint-disable-next-line better-tailwindcss/no-unknown-classes -- Guidance stays dark in both themes, as on develop; `dark` is the design system's theme class. */}
      <div data-host-chrome="bottom" className="dark absolute inset-x-3 bottom-[calc(var(--alpha-dock-overlap,5.75rem)+--spacing(2))] z-50 grid grid-cols-[56px_minmax(0,1fr)_56px] items-center gap-3 rounded-bar bg-secondary p-2.5 text-secondary-foreground motion-safe:animate-rise">
        <MapsRoundButton tone="nightFill" size="2xl" aria-label="End navigation" disabled={!can({ type: "endGuidance" })} onClick={() => void send({ type: "endGuidance" })}><X /></MapsRoundButton>
        <div className="min-w-0 text-center">
          <div className="font-display text-figure-sm font-light">{arrived ? "Arrived" : way === undefined ? "" : minutes(way.seconds)}</div>
          {arrived
            ? <div className="mt-0.75 text-meta leading-tight text-muted-foreground">Destination reached</div>
            : way !== undefined && <div role="status" aria-label="Remaining distance and time" className="mt-0.5 text-meta leading-tight text-foreground/70">{`${distance(way.meters)} · arrive ${new Date(startedAt + way.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}${way.live === true ? "" : " · no live traffic"}`}</div>}
        </div>
      </div>
    </>
  );
}
