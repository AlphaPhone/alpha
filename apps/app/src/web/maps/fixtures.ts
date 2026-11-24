// States the Maps components reach, for their stories (`*.meta.tsx`); test-mock builds only.
import type { MapsCard } from "@elizaos/plugin-maps/cards";
import type { Guidance } from "../../../gen/maps__guidance.ts";
import { initial as guidanceStart } from "../../../gen/maps__guidance.ts";
import { initial as returnStart, type EventReturn } from "../../../gen/maps__eventReturn.ts";
import { initial as locatorStart, type Locator } from "../../../gen/maps__location.ts";
import { initial as planeStart, type MapPlane } from "../../../gen/maps__plane.ts";
import type { SavedItem } from "../../../gen/maps__savedPlaces.ts";
import { initial as screenStart, type Screen } from "../../../gen/maps__screen.ts";
import { emptyContent, type CoverageInfo, type GuidanceContent, type MapsContentState, type Shown } from "../../maps/content.vibe";
import type { Place, Route } from "../../maps/maps.schema.vibe";

const ferry = { latitude: 37.7955, longitude: -122.3937 };
const pier = { latitude: 37.8087, longitude: -122.4098 };

/** A provider place with its details. */
export const ferryBuilding: Place = {
  providerId: "alpha-osm", id: "n42", name: "Ferry Building", coordinate: ferry, address: "1 Ferry Building, San Francisco",
  phone: "+1 415 983 8000", openingHours: "Mon–Sun 7:00–20:00", website: "https://example.org/ferry", attribution: "© OpenStreetMap contributors", fetchedAt: 1,
};

/** The place shown in the place sheet. */
export const shownPlace: Shown = {
  id: 3, label: "Ferry Building", coordinate: ferry, kind: "OpenProvider", place: ferryBuilding, providerId: "alpha-osm", providerPlaceId: "n42",
};

/** The same place served by Google: restricted by Google's terms. */
export const shownGooglePlace: Shown = { ...shownPlace, kind: "GoogleProvider", providerId: "eliza-cloud-google" };

/** A walking route with three steps. */
export const walkRoute: Route = {
  providerId: "alpha-osm", id: "r1", from: ferry, to: pier, mode: "walk", geometry: [ferry, { latitude: 37.8, longitude: -122.4 }, pier],
  distanceMeters: 2100, durationSeconds: 1560, attribution: "© OpenStreetMap contributors", fetchedAt: 1, traffic: "none",
  steps: [
    { instruction: "Head north on The Embarcadero", coordinate: ferry, distanceMeters: 1200, maneuver: "depart" },
    { instruction: "Turn left onto Beach Street", coordinate: { latitude: 37.8, longitude: -122.4 }, distanceMeters: 900, maneuver: "left" },
    { instruction: "Arrive at Pier 39", coordinate: pier, distanceMeters: 0, maneuver: "arrive" },
  ],
};

/** The same route a bit faster, as an alternative. */
export const altRoute: Route = { ...walkRoute, id: "r2", durationSeconds: 1500, distanceMeters: 2300 };

/** Guidance in progress on the first step, screen-off service running. */
export const guiding: Guidance = { ...guidanceStart, session: 1, phase: "Guiding", route: 1, lastStep: 2, fixUsable: true };

/** Guidance off the route. */
export const offRoute: Guidance = { ...guiding, offRoute: true };

/** Arrived at the destination. */
export const arrived: Guidance = { ...guiding, phase: "Arrived" };

/** The route and fix guidance shows. */
export const guidanceContent: GuidanceContent = {
  session: 1, route: walkRoute, marks: [0, 1200, 2100], destination: "Pier 39", kind: "OpenProvider",
  fix: { coordinate: ferry, accuracyMeters: 8, timestamp: 1, precision: "precise" }, title: "", text: "", screenOff: true,
};

/** A route card from the agent. */
export const routeCard: MapsCard = {
  kind: "route", travelMode: "walk", distanceMeters: 2100, durationSeconds: 1560, warnings: [], attribution: "© OpenStreetMap contributors",
  origin: { name: "Ferry Building", latitude: ferry.latitude, longitude: ferry.longitude, provider: "alpha-osm", providerPlaceId: "n42", categories: [] },
  destination: { name: "Pier 39", latitude: pier.latitude, longitude: pier.longitude, provider: "alpha-osm", providerPlaceId: "n77", categories: [] },
};

/** A request for the phone's location to search around it. */
export const locateCard: MapsCard = { kind: "locate", intent: "place-near", prompt: "coffee near me", query: "coffee" };

/** Alpha Cloud's open map provider, covering every travel mode but transit. */
export const openCoverage: CoverageInfo = {
  providerId: "alpha-osm", kind: "OpenProvider", connectionId: "conn_alphaStoryMaps0001", revision: "1", attribution: "© OpenStreetMap contributors", sourceName: "OpenStreetMap",
  recipients: [{ role: "gateway", name: "Alpha Cloud", operator: "Alpha" }, { role: "search", name: "Nominatim", operator: "OpenStreetMap Foundation" }],
  regions: [], offer: { drive: true, walk: true, bicycle: true, transit: false, alternatives: true, map: true, liveTraffic: false },
};

/** Nothing fetched yet, with the provider known. */
export const covered: MapsContentState = { ...emptyContent, coverage: openCoverage, recent: ["coffee", "Pier 39"] };

/** Maps could not reach Cloud. */
export const unreachable: MapsContentState = { ...emptyContent, message: "Maps is unavailable. Check the connection and try again." };

/** The map before any search. */
export const idleScreen: Screen = screenStart;

/** A search for coffee, waiting on its answer. */
export const searchingScreen: Screen = { ...screenStart, searching: true, query: "coffee", queryRun: 1, search: "Loading", searched: "coffee" };

/** The same search, answered. */
export const resultsScreen: Screen = { ...searchingScreen, search: "Ready" };

/** A pier near the Ferry Building, for a second result. */
const pier39 = { ...ferryBuilding, id: "n77", name: "Pier 39", coordinate: pier, address: "Beach Street & The Embarcadero, San Francisco", phone: "", website: "" };

/** Two places for the coffee search. */
export const resultsContent: MapsContentState = { ...covered, results: { run: 1, places: [ferryBuilding, pier39] } };

/** A search that found nothing. */
export const emptyResultsScreen: Screen = { ...searchingScreen, query: "zzzz", searched: "zzzz", search: "Empty" };

/** A search that failed. */
export const failedResultsScreen: Screen = { ...searchingScreen, search: "Failed" };

/** The Ferry Building chosen from the results. */
export const placeScreen: Screen = { ...resultsScreen, choice: "ResultChoice", choiceId: shownPlace.id, details: "Ready" };

/** The place sheet's content. */
export const placeContent: MapsContentState = { ...resultsContent, shown: shownPlace };

/** The same place served by Google's provider. */
export const googlePlaceContent: MapsContentState = { ...placeContent, coverage: { ...openCoverage, providerId: "eliza-cloud-google", kind: "GoogleProvider" }, shown: shownGooglePlace };

/** Walking directions from here to the place, two routes found. */
export const directionsScreen: Screen = { ...placeScreen, directions: true, origin: true, originKind: "LocatedOrigin", travel: "Walk", route: "Ready", routeRun: 1, routes: 2 };

/** The routes directions show. */
export const directionsContent: MapsContentState = { ...placeContent, routes: { run: 1, routes: [walkRoute, altRoute] } };

/** Guidance's content over the directions. */
export const guidingContent: MapsContentState = { ...directionsContent, guidance: guidanceContent };

/** A ready map plane on the open raster map. */
export const planeReady: MapPlane = { ...planeStart, generation: 1, element: 1, basemap: "OpenRaster", built: true, state: "PlaneReady" };

/** The map plane failed to draw. */
export const planeFailed: MapPlane = { ...planeReady, state: "PlaneFailed" };

/** The credits panel open. */
export const planeCredits: MapPlane = { ...planeReady, infoOpen: true };

/** Two saved places. */
export const savedPlaces: SavedItem[] = [
  { id: 1, label: "Home", lat: 37_776_000, lng: -122_417_000, provider: "", providerPlaceId: "" },
  { id: 2, label: "Ferry Building", lat: 37_795_500, lng: -122_393_700, provider: "alpha-osm", providerPlaceId: "n42" },
];

/** No event to go back to. */
export const noReturn: EventReturn = returnStart;

/** A place opened from a Calendar event, offering the way back. */
export const fromEvent: EventReturn = { ...returnStart, inMaps: true, fromCalendar: true, origin: 1, lastOrigin: 1 };

/** The location request, idle. */
export const locatorIdle: Locator = locatorStart;

/** Android refused the location. */
export const locationDenied: Locator = { ...locatorStart, purpose: "OwnerFix", phase: "Failed", failure: "Denied", prompted: true };
