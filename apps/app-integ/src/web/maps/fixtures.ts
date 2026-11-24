// States the Maps components reach, for their stories (`*.meta.tsx`); test-mock builds only.
import type { MapsCard } from "@elizaos/plugin-maps/cards";
import type { Guidance } from "../../../gen/maps__guidance.ts";
import { initial as guidanceStart } from "../../../gen/maps__guidance.ts";
import type { GuidanceContent, Shown } from "../../maps/content.vibe";
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
