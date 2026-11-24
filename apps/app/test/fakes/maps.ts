// spec/app/maps/connection.md, "Every Maps request goes through eliza's cloud client under its own request key, and a tile comes back as its image"
import type { LocationErrorEvent, LocationPlugin, LocationResult } from "@elizaos/os/bridges/definitions/location";
import type { CloudClient } from "../../src/platform/cloud.vibe";
import { type Faked, plugin } from "./phone.ts";
import type { Route } from "./routes.ts";

type Capabilities = Awaited<ReturnType<CloudClient["mapsCapabilities"]>>;
type CloudPlace = Awaited<ReturnType<CloudClient["mapsPlacesSearch"]>>["places"][number];
type CloudRoute = Awaited<ReturnType<CloudClient["mapsRoutes"]>>["routes"][number];

const attribution = "Map data from the test provider";

/** A place as the fake Cloud Maps answers it, typed by eliza's own schema. */
export function cloudPlace(id: string, name: string, latitude: number, longitude: number, phone?: string): CloudPlace {
  return { providerId: "test-open", id, name, coordinate: { latitude, longitude }, attribution, fetchedAt: 1, ...(phone === undefined ? {} : { phone }) };
}

/** A route of `steps` steps along a straight line from `from` to `to`, `meters` long. */
export function cloudRoute(id: string, from: CloudPlace["coordinate"], to: CloudPlace["coordinate"], meters: number, steps: number): CloudRoute {
  const at = (share: number) => ({ latitude: from.latitude + (to.latitude - from.latitude) * share, longitude: from.longitude + (to.longitude - from.longitude) * share });
  return {
    providerId: "test-open", id, from, to, mode: "drive", geometry: [from, to], distanceMeters: meters, durationSeconds: meters / 10,
    steps: Array.from({ length: steps }, (_, index) => ({ instruction: index === 0 ? "Head north" : index === steps - 1 ? "Arrive" : "Turn left", coordinate: at(index / Math.max(1, steps - 1)), distanceMeters: meters / steps })),
    attribution, fetchedAt: 1, traffic: "none",
  };
}

/** What the fake Cloud Maps holds and how it behaves; a journey changes it between steps. */
export interface MapsScene {
  /** The coverage the account's deployment answers. */
  coverage: Capabilities;
  /** Every place a search can find, by the words of its name. */
  places: CloudPlace[];
  /** The routes a plan answers, in order. */
  routes: CloudRoute[];
  /** Searches answer 429 with this wait in seconds, once each, while it is set. */
  limited: number | undefined;
  /** What each Maps request asked, by its route, and the request key it carried. */
  readonly asked: { path: string; key: string | null; body: unknown }[];
  /** Where the fake phone is, and whether it allows location. */
  here: { latitude: number; longitude: number; accuracy: number } | undefined;
  allowed: "granted" | "denied" | "prompt";
  /** How precisely Android lets Alpha locate the phone, once location is allowed. */
  precision: "precise" | "approximate";
  /** The page's listeners of the fake location plugin. */
  readonly listeners: Set<(result: LocationResult) => void>;
  /** The native watches the page started and has not cleared. */
  readonly watches: Set<string>;
}

export const harbour = cloudPlace("test:harbour", "Harbour Cafe", 43.7312, 7.4211, "+377 93 15 00 00");
export const gallery = cloudPlace("test:gallery", "Harbour Gallery", 43.7333, 7.4167);

export function mapsScene(): MapsScene {
  return {
    coverage: {
      available: true, providerId: "test-open", connectionId: "conn_testtesttesttest01", revision: "1", attribution,
      sources: { data: "Test data", search: "Test search", routing: "Test routing" },
      disclosure: { recipients: [{ role: "search", name: "Test search", operator: "Test" }], cloudRecords: "operation-and-result-code" },
      regions: [{ id: "mc", name: "Monaco", bounds: [7.40, 43.70, 7.45, 43.76] }],
      capabilities: {
        map: false, search: true, placeDetails: true, geocode: true, reverseGeocode: true, placeLookup: true,
        modes: ["drive", "walk"], alternatives: true, traffic: "none", transit: "none", offline: { map: false, search: false, routing: false },
      },
    },
    places: [harbour, gallery],
    routes: [],
    limited: undefined,
    asked: [],
    here: { latitude: 43.7300, longitude: 7.4200, accuracy: 8 },
    allowed: "granted",
    precision: "approximate",
    listeners: new Set(),
    watches: new Set(),
  };
}

/** The fake phone moves to `latitude, longitude`, and its open watches report it. */
export function move(scene: MapsScene, latitude: number, longitude: number, accuracy = 8, timestamp = 0) {
  scene.here = { latitude, longitude, accuracy };
  for (const told of scene.listeners) told({ coords: { latitude, longitude, accuracy, timestamp }, cached: false });
}

async function asked(scene: MapsScene, request: Request, url: URL): Promise<unknown> {
  const body: unknown = request.method === "POST" ? await request.json() : undefined;
  scene.asked.push({ path: url.pathname, key: request.headers.get("idempotency-key"), body });
  return body;
}

/** Cloud Maps as eliza's cloud answers it, raw JSON in eliza's own shapes. */
export function mapsRoutes(scene: MapsScene): Route[] {
  return [
    (request, url) => (request.method === "GET" && url.pathname === "/api/v1/maps/capabilities" ? Response.json(scene.coverage) : undefined),
    (request, url) => {
      if (request.method !== "POST" || url.pathname !== "/api/v1/maps/places/search") return;
      return asked(scene, request, url).then((body) => {
        if (scene.limited !== undefined) {
          const wait = scene.limited;
          scene.limited = undefined;
          return Response.json({ error: { code: "RateLimited", message: "slow down" } }, { status: 429, headers: { "retry-after": String(wait) } });
        }
        const query = typeof body === "object" && body !== null && "query" in body ? String(body.query).toLowerCase() : "";
        return Response.json({ providerId: "test-open", attribution, places: scene.places.filter((place) => place.name.toLowerCase().includes(query)) });
      });
    },
    (request, url) => {
      if (request.method !== "POST" || url.pathname !== "/api/v1/maps/places/details") return;
      return asked(scene, request, url).then((body) => {
        const id = typeof body === "object" && body !== null && "id" in body ? String(body.id) : "";
        return Response.json({ providerId: "test-open", attribution, place: scene.places.find((place) => place.id === id) ?? null });
      });
    },
    (request, url) => {
      if (request.method !== "POST" || url.pathname !== "/api/v1/maps/routes") return;
      return asked(scene, request, url).then(() =>
        scene.routes.length === 0
          ? Response.json({ error: { code: "NoRoute", message: "no route" } }, { status: 422 })
          : Response.json({ providerId: "test-open", attribution, routes: scene.routes }));
    },
    (request, url) => {
      if (request.method !== "POST" || url.pathname !== "/api/v1/maps/tiles/viewport") return;
      return asked(scene, request, url).then(() => Response.json({ providerId: "test-open", copyright: "Map data ©2026 Test" }));
    },
  ];
}

/** `ElizaLocation` of eliza's Android package: its permission, which Maps and Settings read, one watch per call, and the positions the scene moves to. */
export function elizaLocation(scene: MapsScene, now: () => number): Faked {
  return plugin<LocationPlugin, { locationChange: LocationResult; error: LocationErrorEvent }>((emit) => {
    const told = (result: LocationResult) => emit("locationChange", result);
    let next = 0;
    return {
      checkPermissions: () => Promise.resolve({ location: scene.allowed, accuracy: scene.precision }),
      requestPermissions: () => Promise.resolve({ location: scene.allowed === "prompt" ? "granted" : scene.allowed, accuracy: scene.precision }),
      getCurrentPosition: () => Promise.reject(new Error("not used by Maps")),
      watchPosition: () => {
        const watchId = `w${++next}`;
        scene.watches.add(watchId);
        scene.listeners.add(told);
        const here = scene.here;
        if (here) queueMicrotask(() => told({ coords: { ...here, timestamp: now() }, cached: false }));
        return Promise.resolve({ watchId });
      },
      clearWatch: ({ watchId }) => {
        scene.watches.delete(watchId);
        if (scene.watches.size === 0) scene.listeners.delete(told);
        return Promise.resolve();
      },
      removeAllListeners: () => Promise.resolve(),
    };
  });
}
