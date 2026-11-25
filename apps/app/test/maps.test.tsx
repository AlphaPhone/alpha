// @vitest-environment happy-dom
import { Effect } from "effect";
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Screen } from "../gen/app__maps.effect.vibe";
import { Machine as Credits } from "../gen/app__maps__credits.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import maps from "../src/maps/index.tsx";
import { handedOver, tile } from "../src/maps/maps.vibe";
import type { Alpha } from "../src/runtime/area.tsx";
import { button, closeAll, fill, hardware, later, only, open, press, seen, underAct, until as reached } from "./alpha.tsx";
import { cloudRoute, gallery, harbour, move, speech } from "./fakes/maps.ts";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const withMaps = only("home", "view:Maps");

/** `until`, failing with the last state it saw when that state does not come within ten seconds. */
const until: typeof reached = async (alpha, runtime, key, ok) => {
  let last: unknown;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, fail) => { timer = setTimeout(() => fail(new Error(`not reached; last state: ${JSON.stringify(last)?.slice(0, 4000)}`)), 10_000); });
  try {
    await Promise.race([reached(alpha, runtime, key, (state) => { last = state; return ok(state); }), late]);
  } finally {
    clearTimeout(timer);
  }
};

/** Press Enter in the field whose accessible name is `name`. */
const enter = (name: string) => act(async () => {
  const field = [...document.querySelectorAll("input")].find((found) => found.getAttribute("aria-label") === name);
  if (!field?.form) throw new Error(`no form around ${name}`);
  field.form.requestSubmit();
});

/** Open Maps from the shell, as Home's tile or the agent does. */
const showMaps = (alpha: Alpha) => act(async () => {
  await alpha.runtime.runPromise(Effect.ignore(Effect.flatMap(Shell, (shell) => shell.send({ type: "openView", view: "Maps" }))));
});

/** Focus the field whose accessible name is `name`. */
const focus = (name: string) => act(async () => {
  [...document.querySelectorAll("input")].find((found) => found.getAttribute("aria-label") === name)?.focus();
});

/** The places the results list shows, by name. */
const results = () => [...document.querySelectorAll("section[aria-label=Maps] button")].map((found) => found.getAttribute("aria-label")).filter((name) => name?.startsWith("Harbour"));

describe("Maps on a phone", () => {
  it("Search for a place, get directions and navigate (spec/app/maps/index.md, \"Story: Search for a place\"; spec/app/maps/index.md, \"Story: Get directions\"; spec/app/maps/index.md, \"Story: Navigate\")", async () => {
    const world = { ...scene(), phone: true };
    world.settings.location = { location: "granted", accuracy: "precise" };
    const start = { latitude: 43.7300, longitude: 7.4200 };
    world.maps.routes = [cloudRoute("fast", start, harbour.coordinate, 400, 3), cloudRoute("scenic", start, harbour.coordinate, 500, 4)];
    const { alpha } = await open(world, withMaps);
    await showMaps(alpha);
    const runtime = maps.runtime(alpha);

    // spec/app/maps/index.md, "Opening Maps, the network returning or Retry reads the coverage when no provider works, and leaves a working one alone"
    await until(alpha, runtime, Screen, (s) => s.link.provider !== 0 && s.link.offer.walk && !s.link.offer.transit);

    // spec/app/maps/connection.md, "Retry draws a broken map again on a new surface": this page has no WebGL, so MapLibre cannot draw
    await until(alpha, runtime, Screen, (s) => s.link.surface === "Broken");
    expect(document.querySelector("[role=application]")).not.toBeNull();
    await press("Retry");
    await until(alpha, runtime, Screen, (s) => s.link.plane > 2 && s.link.surface === "Broken");

    // spec/app/maps/index.md, "Only the newest search's answer is shown: results, none, or a failure"
    await focus("Search Maps");
    await fill("Search Maps", "harbour");
    await enter("Search Maps");
    await until(alpha, runtime, Screen, (s) => s.search.status === "Loaded" && s.results === 2);
    expect(results()).toEqual(["Harbour Cafe", "Harbour Gallery"]);
    const search = world.maps.asked.at(-1);
    expect([search?.path, (search?.body as { query?: string }).query, typeof search?.key]).toEqual(["/api/v1/maps/places/search", "harbour", "string"]);

    // spec/app/maps/index.md, "A result opens its place"
    await press("Harbour Cafe");
    await until(alpha, runtime, Screen, (s) => s.place !== 0 && s.sheet === "Half");

    // spec/app/maps/index.md, "\"Use my location\" locates once when allowed, asks when it may, and otherwise opens Settings"; spec/app/maps/index.md, "A fix goes to whoever holds the location"
    await press("Directions");
    await until(alpha, runtime, Screen, (s) => s.trip.route !== 0 && s.trip.origin === "MyLocation" && s.link.locator === "Nobody");
    expect(world.maps.asked.at(-1)?.body).toMatchObject({ from: start, to: harbour.coordinate, mode: "drive" });

    // spec/app/maps/index.md, "Directions are asked for a way of travelling the provider offers, and another way asks again from the same start"
    expect(button("Transit")).toBeUndefined();
    await press("Walk");
    await until(alpha, runtime, Screen, (s) => s.trip.travel === "Walk" && s.trip.plan.status === "Loaded");
    expect(world.maps.asked.at(-1)?.body).toMatchObject({ mode: "walk" });

    // spec/app/maps/index.md, "The provider's routes are listed in order, and choosing one shows it and sends no new request"
    const asked = world.maps.asked.length;
    await press("Alternative 1: 1 min, 500 m");
    await until(alpha, runtime, Screen, (s) => s.chosen === 1 && s.trip.turns === 4);
    expect(world.maps.asked.length).toBe(asked);

    // spec/app/maps/index.md, "Start guides along the route shown, with location allowed"
    await press("Start");
    await until(alpha, runtime, Screen, (s) => s.trip.guidance === "Going" && s.link.locator === "Guide");

    // spec/app/maps/navigation.md, "A fix moves guidance only when it is precise, fresh and close: arrival within 25 meters, a turn passed within 40 meters or beyond 60, the route left beyond 75"
    move(world.maps, harbour.coordinate.latitude, harbour.coordinate.longitude, 8, world.now);
    await until(alpha, runtime, Screen, (s) => s.trip.guidance === "Arrived" && s.link.locator === "Nobody");
    await until(alpha, runtime, Screen, () => world.maps.watches.size === 0);

    // spec/app/maps/index.md, "End stops guidance and its location and goes back to the directions"
    await press("End");
    await until(alpha, runtime, Screen, (s) => s.trip.guidance === "Stopped" && s.directions);

    // spec/app/maps/index.md, "Back leaves one mode: navigation to its directions, directions to the place, the place to the search, the search to the map"
    await hardware("back");
    await until(alpha, runtime, Screen, (s) => !s.directions && s.place !== 0);
    await hardware("back");
    await until(alpha, runtime, Screen, (s) => s.place === 0 && s.searching && s.trip.route === 0);
    await hardware("back");
    await until(alpha, runtime, Screen, (s) => !s.searching && s.query === "" && s.recent[0] === "harbour");
    await hardware("back");
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.length === 0);
  });

  it("Keep guiding away from Maps (spec/app/maps/index.md, \"Story: Keep guiding away from Maps\"; spec/app/maps/navigation.md, \"Story: Keep guiding with the screen off\"; spec/app/maps/navigation.md, \"Story: Hear the next instruction\")", async () => {
    const heard = speech();
    const world = { ...scene(), phone: true };
    world.settings.location = { location: "granted", accuracy: "precise" };
    const start = { latitude: 43.7300, longitude: 7.4200 };
    world.maps.routes = [cloudRoute("fast", start, harbour.coordinate, 400, 3)];
    const { alpha } = await open(world, withMaps);
    await showMaps(alpha);
    const runtime = maps.runtime(alpha);
    await until(alpha, runtime, Screen, (s) => s.link.provider !== 0);
    await focus("Search Maps");
    await fill("Search Maps", "cafe");
    await enter("Search Maps");
    await until(alpha, runtime, Screen, (s) => s.search.status === "Loaded" && s.results === 1);
    await press("Harbour Cafe");
    await press("Directions");
    await until(alpha, runtime, Screen, (s) => s.trip.route !== 0 && s.trip.plan.status === "Loaded");

    // spec/app/maps/index.md, "Start guides along the route shown, with location allowed"; spec/app/maps/index.md, "Android confirms or loses the service of this journey"
    await press("Start");
    await until(alpha, runtime, Screen, (s) => s.trip.guidance === "Going" && s.trip.service === "Running" && s.following);
    expect([world.maps.guidance.session, world.maps.guidance.title, world.maps.guidance.text]).toEqual(["alpha-maps-1", "Navigating to Harbour Cafe", "Head north"]);

    // spec/app/maps/index.md, "Guidance speaks the newest instruction with Maps on screen, once, and the instruction owed on coming back"; spec/app/maps/navigation.md, "An instruction is spoken for its turn and distance band: now within 50 meters, soon within 250, far beyond"
    await until(alpha, runtime, Screen, (s) => s.trip.speaking === 0);
    expect(heard.spoken).toEqual(["Head north"]);

    // spec/app/maps/index.md, "Guidance follows the phone until the owner moves the map, and Recenter follows it again": this page has no WebGL, so the owner's pan is told as the map tells it
    await act(async () => { await runtime.runPromise(Effect.ignore(Effect.flatMap(Screen, (screen) => screen.send({ type: "panMap" })))); });
    await until(alpha, runtime, Screen, (s) => !s.following);
    await press("Recenter");
    await until(alpha, runtime, Screen, (s) => s.following);

    // spec/app/maps/index.md, "Leaving Maps keeps guidance with its service and ends it without; a pending \"Use my location\" and the Calendar return end": locking the phone is leaving
    await seen(false);
    await until(alpha, runtime, Screen, (s) => s.trip.away && s.trip.guidance === "Going");

    // spec/app/maps/navigation.md, "The next turn is spoken with Maps on screen, never while it is away, and the instruction owed is spoken on coming back"
    await until(alpha, runtime, Screen, (s) => s.trip.speaking === -1);
    expect(heard.spoken).toEqual(["Head north"]);

    // spec/app/maps/index.md, "The notification of this journey opens Maps on its guidance, or stops it"
    world.maps.guidance.opened = true;
    await seen(true);
    await until(alpha, runtime, Screen, (s) => !s.trip.away && s.trip.guidance === "Going");
    await until(alpha, runtime, Screen, (s) => s.trip.speaking === 0);
    expect(heard.spoken).toEqual(["Head north", "Head north"]);
    await seen(false);
    await until(alpha, runtime, Screen, (s) => s.trip.away);
    await act(async () => { world.maps.guidance.stop?.("notification"); });
    await until(alpha, runtime, Screen, (s) => s.trip.guidance === "Stopped" && s.guideNotice === "StoppedFromNotification" && s.link.locator === "Nobody");
    await seen(true);
    await until(alpha, runtime, Screen, (s) => !s.trip.away);
    expect(document.body.textContent).toContain("Navigation stopped from the notification.");

    // spec/app/maps/index.md, "The owner is told why guidance ended when it was not by their own End": the service lost while away
    await press("Start");
    await until(alpha, runtime, Screen, (s) => s.trip.service === "Running" && s.guideNotice === "Quiet");
    await seen(false);
    await until(alpha, runtime, Screen, (s) => s.trip.away);
    await act(async () => { world.maps.guidance.stop?.("task-removed"); });
    await until(alpha, runtime, Screen, (s) => s.trip.guidance === "Stopped" && s.guideNotice === "PausedAway");
    await seen(true);
    await until(alpha, runtime, Screen, (s) => !s.trip.away);
    expect(document.body.textContent).toContain("Navigation paused while the app is in the background. Tap Start to resume.");

    // spec/app/maps/index.md, "Arriving with Maps away is told once on the phone"
    await press("Start");
    await until(alpha, runtime, Screen, (s) => s.trip.service === "Running");
    await seen(false);
    await until(alpha, runtime, Screen, (s) => s.trip.away);
    move(world.maps, harbour.coordinate.latitude, harbour.coordinate.longitude, 8, world.now);
    await until(alpha, runtime, Screen, (s) => s.trip.guidance === "Arrived");
    await until(alpha, runtime, Screen, () => world.maps.guidance.session === undefined && world.maps.guidance.arrivals.length === 1);
    expect(world.maps.guidance.arrivals).toEqual(["Arrived at Harbour Cafe."]);
  });

  it("Signed out, Maps asks Cloud nothing and says to sign in (spec/app/maps/index.md, \"Story: Connect through my cloud account\")", async () => {
    const world = { ...scene(), phone: true, signedIn: false };
    const { alpha } = await open(world, withMaps);
    await showMaps(alpha);
    const runtime = maps.runtime(alpha);
    // spec/app/maps/connection.md, "Signing in, out or to another account retires the provider and reads the new account's coverage"
    await until(alpha, runtime, Screen, (s) => s.link.account === 0 && s.link.basemap === "World");
    await later(alpha, 1000);
    expect(world.maps.asked).toEqual([]);

    // spec/app/maps/connection.md, "Signing in, out or to another account retires the provider and reads the new account's coverage": signing in later is seen when Maps comes back on screen
    world.signedIn = true;
    await hardware("back");
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.length === 0);
    await showMaps(alpha);
    await until(alpha, runtime, Screen, (s) => s.link.known && s.link.account !== 0 && s.link.provider !== 0);
  });
});

describe("Maps in a browser", () => {
  it("Look at a place and keep it (spec/app/maps/index.md, \"Story: Look at a place\")", async () => {
    const world = scene();
    localStorage.setItem("alpha.maps.saved-places.v1", JSON.stringify({ version: 1, items: [
      { id: "a1", label: "Office", coordinate: { latitude: 43.7401, longitude: 7.4262 }, savedAt: 1 },
      { id: "a2", label: "Lunch", coordinate: { latitude: 43.7, longitude: 7.4 }, providerId: "eliza-cloud-google", providerPlaceId: "g1", savedAt: 2 },
    ] }));
    const first = await open(world, withMaps);
    await showMaps(first.alpha);
    const runtime = maps.runtime(first.alpha);
    await until(first.alpha, runtime, Screen, (s) => s.link.provider !== 0);

    // spec/app/maps/index.md, "Saved places are kept on the phone, and are what survives a restart": the previous Alpha's list is read
    await until(first.alpha, runtime, Screen, (s) => s.saved.length === 1 && s.saved[0]?.name === "Office");

    // spec/app/maps/credits.md, "The credits panel opens from the badge or the information button of a drawn surface": this page has no WebGL, so the surface's drawing is told as the map tells it; Back closes the panel first
    expect(button("Map credits")).toBeUndefined();
    await act(async () => {
      await runtime.runPromise(Effect.flatMap(Screen, (screen) => Effect.flatMap(screen.get(), (s) => Effect.ignore(screen.send({ type: "reportMap", plane: s.link.plane, ok: true })))));
    });
    await until(first.alpha, runtime, Credits, (s) => s.drawn);
    await press("Map credits");
    await until(first.alpha, runtime, Credits, (s) => s.infoOpen);
    expect(document.body.textContent).toContain("Map data from the test provider");
    await hardware("back");
    await until(first.alpha, runtime, Credits, (s) => !s.infoOpen);
    await until(first.alpha, first.alpha.runtime, Shell, (s) => s.trail.at(-1) === "Maps");

    // spec/app/maps/index.md, "Coordinates typed into Search drop a pin"
    await focus("Search Maps");
    await fill("Search Maps", "43.73, 7.42");
    await enter("Search Maps");
    await until(first.alpha, runtime, Screen, (s) => s.place !== 0 && !s.pinning);
    expect(world.maps.asked).toEqual([]);
    // spec/app/maps/index.md, "The card shares the place or the arrival time, opens its website, or opens it in the phone's maps app": a dropped pin is a selected location, and shares by the sheet, Email or its link
    expect([document.body.textContent?.includes("Selected location"), Boolean(button("Share")), Boolean(button("Email")), Boolean(button("Copy link"))]).toEqual([true, true, true, true]);

    // spec/app/maps/index.md, "The place on the card is saved under a name, renamed under another, or forgotten"; spec/app/maps/index.md, "A saved list that cannot be read is never written over, and a change is told only once it reads back"
    await fill("Name", "Pier");
    await press("Save");
    await until(first.alpha, runtime, Screen, (s) => s.saved.length === 2 && s.saved[1]?.name === "Pier" && s.notice === "PlaceSaved");
    expect(document.body.textContent).toContain("Place saved on this device.");
    await fill("Name", "Quay");
    await press("Rename");
    await until(first.alpha, runtime, Screen, (s) => s.saved.length === 2 && s.saved[1]?.name === "Quay" && s.notice === "PlaceRenamed");
    expect(document.body.textContent).toContain("Saved on this device");
    // spec/app/maps/places.md, "A saved place keeps its name, its coordinates and the provider's identity of it, and nothing else"
    const stored = JSON.parse(localStorage.getItem("alpha/maps/saved@1") ?? "[]") as { name: string; spot: Record<string, unknown> }[];
    expect(stored.map((entry) => [entry.name, Object.keys(entry.spot).filter((key) => ["address", "phone", "website", "hours"].includes(key))])).toEqual([["Office", []], ["Quay", []]]);
    await first.close();

    // spec/app/maps/index.md, "Saved places are kept on the phone, and are what survives a restart"
    world.maps.coverage = { ...world.maps.coverage, providerId: "eliza-cloud-google" } as typeof world.maps.coverage;
    const second = await open(world, withMaps);
    await showMaps(second.alpha);
    const again = maps.runtime(second.alpha);
    await until(second.alpha, again, Screen, (s) => s.saved.length === 2 && s.link.google);
    expect([Boolean(button("Quay")), Boolean(button("Office"))]).toEqual([true, true]);

    // spec/app/maps/connection.md, "Google's content is drawn only on Google's own map, whose only credit is the Google Maps badge": a Google provider that sends no raster draws no world map in its place
    expect([document.body.textContent?.includes("The Google map is missing."), document.querySelector("[role=application]")]).toEqual([true, null]);
    // spec/app/maps/index.md, "The place on the card is saved under a name, renamed under another, or forgotten": a place Google served is never saved or shared
    await focus("Search Maps");
    await fill("Search Maps", "gallery");
    await enter("Search Maps");
    await until(second.alpha, again, Screen, (s) => s.search.status === "Loaded");
    await press("Harbour Gallery");
    await until(second.alpha, again, Screen, (s) => s.place !== 0);
    expect([Boolean(button("Directions")), Boolean(button("Save")), Boolean(button("Share")), Boolean(button("Email")), Boolean(button("Copy link"))]).toEqual([true, false, false, false, false]);

    // spec/app/maps/index.md, "A route is asked from coordinates or another place, which ends a pending \"Use my location\"": no control prompts for coordinates
    await press("Directions");
    await until(second.alpha, again, Screen, (s) => s.directions);
    expect([document.querySelector("input[aria-label='Starting point']")?.getAttribute("placeholder"), Boolean(button("From Office"))]).toEqual(["Place", true]);
  });

  it("A saved list Alpha cannot read is never written over (spec/app/maps/index.md, \"Story: Look at a place\")", async () => {
    const world = scene();
    localStorage.setItem("alpha/maps/saved@1", "{not json");
    const { alpha } = await open(world, withMaps);
    await showMaps(alpha);
    const runtime = maps.runtime(alpha);
    // spec/app/maps/index.md, "A saved list that cannot be read is never written over, and a change is told only once it reads back"
    await until(alpha, runtime, Screen, (s) => s.link.provider !== 0 && !s.keepable);
    expect(document.body.textContent).toContain("Saved places could not be read. Existing data has not been replaced.");
    await focus("Search Maps");
    await fill("Search Maps", "48.85, 2.35");
    await enter("Search Maps");
    await until(alpha, runtime, Screen, (s) => s.place !== 0);
    expect([button("Save"), localStorage.getItem("alpha/maps/saved@1")]).toEqual([undefined, "{not json"]);

    // spec/app/maps/index.md, "A place outside every region the provider covers keeps its coordinates and says so"
    expect([document.body.textContent?.includes("This location is outside Test data coverage."), Boolean(button("Directions"))]).toEqual([true, true]);
  });

  it("Search as I type, start from a place by its name and swap the ends (spec/app/maps/index.md, \"Story: Search for a place\"; spec/app/maps/index.md, \"Story: Get directions\")", async () => {
    const world = scene();
    world.maps.routes = [cloudRoute("there", harbour.coordinate, gallery.coordinate, 300, 2)];
    const { alpha } = await open(world, withMaps);
    await showMaps(alpha);
    const runtime = maps.runtime(alpha);
    await until(alpha, runtime, Screen, (s) => s.link.provider !== 0);

    // spec/app/maps/index.md, "Typing searches once the owner pauses for 350 milliseconds, and Enter searches at once"
    await focus("Search Maps");
    await fill("Search Maps", "gallery");
    await until(alpha, runtime, Screen, (s) => s.pausing);
    expect(world.maps.asked).toEqual([]);
    await later(alpha, 350);
    await until(alpha, runtime, Screen, (s) => s.search.status === "Loaded" && s.results === 1);
    const asked = world.maps.asked.length;
    await fill("Search Maps", "GALLERY");
    await enter("Search Maps");
    await later(alpha, 400);
    expect([world.maps.asked.length, (await runtime.runPromise(Effect.flatMap(Screen, (screen) => screen.get()))).recent]).toEqual([asked, ["gallery"]]);

    // spec/app/maps/index.md, "The card shares the place or the arrival time, opens its website, or opens it in the phone's maps app"; spec/app/maps/index.md, "A copied number is told: \"Number copied\" or \"Couldn't copy\""
    await press("Harbour Gallery");
    await until(alpha, runtime, Screen, (s) => s.place !== 0);
    expect(button("Copy number")).toBeUndefined();

    // spec/app/maps/index.md, "A starting point can be a place found by its name, around the phone or the last start"
    await press("Directions");
    await fill("Starting point", "cafe");
    await enter("Starting point");
    await until(alpha, runtime, Screen, (s) => s.origins.status === "Loaded" && s.originsFound === 1);
    await press("From Harbour Cafe");
    await until(alpha, runtime, Screen, (s) => s.trip.route !== 0 && s.startPlace !== 0 && s.trip.origin === "SomePlace");
    expect(world.maps.asked.at(-1)?.body).toMatchObject({ from: harbour.coordinate, to: gallery.coordinate });

    // spec/app/maps/index.md, "Swapping the ends keeps each end's place and plans the reverse route"
    const before = await runtime.runPromise(Effect.flatMap(Screen, (screen) => screen.get()));
    await press("Swap ends");
    await until(alpha, runtime, Screen, (s) => s.place === before.startPlace && s.startPlace === before.place && s.trip.route !== 0);
    expect(world.maps.asked.at(-1)?.body).toMatchObject({ from: gallery.coordinate, to: harbour.coordinate });
    expect(button("Copy number")).toBeUndefined();
    await hardware("back");
    await hardware("back");
    await until(alpha, runtime, Screen, (s) => !s.directions && s.place === before.startPlace);
    await press("Copy number");
    await until(alpha, runtime, Screen, (s) => s.copyNotice !== "Uncopied");
    expect(document.body.textContent).toMatch(/Number copied|Couldn't copy/);
  });

  it("Back off when Maps asks me to wait (spec/app/maps/connection.md, \"Story: Serve Maps through my cloud account\")", async () => {
    const world = { ...scene(), now: Date.now() };
    const { alpha } = await open(world, withMaps);
    await showMaps(alpha);
    const runtime = maps.runtime(alpha);
    await until(alpha, runtime, Screen, (s) => s.link.provider !== 0);

    // spec/app/maps/connection.md, "A wait Cloud names holds every Maps request back until it ends: a rate limit for at most a day, a spent allowance for at most 400 days, and any other wait one minute"; spec/app/maps/index.md, "Cloud's wait holds the screen's requests until it ends, and its end lets them go again"
    world.maps.limited = 120;
    await focus("Search Maps");
    await fill("Search Maps", "harbour");
    await enter("Search Maps");
    await until(alpha, runtime, Screen, (s) => s.search.status === "Failed" && s.link.held >= 119 && s.link.held <= 121);
    expect(document.body.textContent).toMatch(/Maps request limit reached\. Try again in [23] minutes\./);
    const asked = world.maps.asked.length;
    await fill("Search Maps", "harbour cafe");
    await enter("Search Maps");
    await later(alpha, 1000);
    const held = await runtime.runPromise(Effect.flatMap(Screen, (screen) => screen.get()));
    expect([world.maps.asked.length, held.query]).toEqual([asked, "harbour"]);

    await later(alpha, 122_000);
    await until(alpha, runtime, Screen, (s) => s.link.held === 0);
    await fill("Search Maps", "harbour");
    await enter("Search Maps");
    await until(alpha, runtime, Screen, (s) => s.search.status === "Loaded" && s.results === 2);

    // spec/app/maps/connection.md, "A wait Cloud names holds every Maps request back until it ends: a rate limit for at most a day, a spent allowance for at most 400 days, and any other wait one minute": a wait that names no end holds a minute
    world.maps.limited = 0;
    await fill("Search Maps", "gallery");
    await enter("Search Maps");
    await until(alpha, runtime, Screen, (s) => s.search.status === "Failed" && s.link.held === 60);
    await later(alpha, 60_000);
    await until(alpha, runtime, Screen, (s) => s.link.held === 0);

    // spec/app/maps/connection.md, "A wait Cloud names holds every Maps request back until it ends: a rate limit for at most a day, a spent allowance for at most 400 days, and any other wait one minute": a tile's wait holds the search, and a search's wait refuses tiles without asking
    world.maps.tilesLimited = 90;
    const tried = (z: number) => act(() => runtime.runPromise(Effect.match(tile(z, 0, 0, new AbortController().signal), { onFailure: () => false, onSuccess: () => true })));
    expect(await tried(1)).toBe(false);
    await until(alpha, runtime, Screen, (s) => s.link.held >= 89 && s.link.held <= 91);
    const searches = world.maps.asked.length;
    await fill("Search Maps", "cafe");
    await enter("Search Maps");
    await later(alpha, 500);
    expect(world.maps.asked.length).toBe(searches);
    await later(alpha, 92_000);
    await until(alpha, runtime, Screen, (s) => s.link.held === 0);
    world.maps.limited = 120;
    await fill("Search Maps", "harbour gallery");
    await enter("Search Maps");
    await until(alpha, runtime, Screen, (s) => s.link.held >= 119);
    const tiles = world.maps.tiles.length;
    expect([await tried(2), world.maps.tiles.length]).toEqual([false, tiles]);
  });

  it("Maps that the deployment does not offer says so and is not read again on its own (spec/app/maps/connection.md, \"Story: Serve Maps through my cloud account\")", async () => {
    const world = scene();
    world.maps.coverage = { available: false };
    const { alpha } = await open(world, withMaps);
    await showMaps(alpha);
    const runtime = maps.runtime(alpha);
    // spec/app/maps/connection.md, "Only the newest read's answer is taken, while signed in, and a healthy answer installs the provider for that account"; spec/app/maps/index.md, "Opening Maps, the network returning or Retry reads the coverage when no provider works, and leaves a working one alone"
    await until(alpha, runtime, Screen, (s) => s.link.unoffered && s.link.provider === 0);
    expect(document.body.textContent).toContain("Maps unavailable");
    const { link } = await runtime.runPromise(Effect.flatMap(Screen, (screen) => screen.get()));
    await later(alpha, 31_000);
    const after = await runtime.runPromise(Effect.flatMap(Screen, (screen) => screen.get()));
    expect([after.link.coverage.ticket, document.body.textContent?.includes("Maps could not be reached.")]).toEqual([link.coverage.ticket, false]);
  });

  it("A full saved list only renames (spec/app/maps/places.md, \"Story: Keep my saved places\")", async () => {
    const world = scene();
    const full = Array.from({ length: 200 }, (_, index) => ({ name: `Place ${index + 1}`, spot: { name: `Place ${index + 1}`, category: "", at: { lat: 43_000_000 + index, lng: 7_000_000 }, providerId: "", id: "", google: false } }));
    localStorage.setItem("alpha/maps/saved@1", JSON.stringify(full));
    const { alpha } = await open(world, withMaps);
    await showMaps(alpha);
    const runtime = maps.runtime(alpha);
    await until(alpha, runtime, Screen, (s) => s.link.provider !== 0 && s.saved.length === 200);
    // spec/app/maps/places.md, "At most 200 places are saved: a full list only renames"
    await focus("Search Maps");
    await fill("Search Maps", "43.5, 7.5");
    await enter("Search Maps");
    await until(alpha, runtime, Screen, (s) => s.place !== 0 && !s.pinning);
    expect([button("Save"), document.body.textContent?.includes("Saved places are full. Remove one before adding another.")]).toEqual([undefined, true]);
    // spec/app/maps/places.md, "A saved place keeps its name, its coordinates and the provider's identity of it, and nothing else": a pin at a saved place's coordinates is that place
    await hardware("back");
    await fill("Search Maps", "43.000001, 7");
    await enter("Search Maps");
    await until(alpha, runtime, Screen, (s) => s.place === s.saved[1]?.place);
    expect(Boolean(button("Rename"))).toBe(true);
  });

  it("Be told why before Android asks for my location, and sent to Settings once I said no (spec/app/maps/index.md, \"Story: Use my location\"; spec/app/maps/connection.md, \"Story: Use my location\")", async () => {
    const world = { ...scene(), phone: true };
    world.settings.location = { location: "prompt" };
    const { alpha } = await open(world, withMaps);
    await showMaps(alpha);
    const runtime = maps.runtime(alpha);
    await until(alpha, runtime, Screen, (s) => s.link.provider !== 0);
    // spec/app/maps/index.md, "Continuing past the disclosure asks Android, once"
    expect([Boolean(button("Continue")), button("My location")]).toEqual([true, undefined]);
    world.settings.location = { location: "denied" };
    await press("Continue");
    await until(alpha, runtime, Screen, (s) => s.link.disclosed && !s.link.prompting && s.link.location.grant === "Denied");
    expect(world.maps.watches.size).toBe(0);
    // spec/app/maps/index.md, "Settings opens only once Android has said no"; spec/app/maps/index.md, "\"Use my location\" locates once when allowed, asks when it may, and otherwise opens Settings"
    await press("My location");
    await until(alpha, runtime, Screen, () => world.settings.opened.includes("location"));
    expect(world.maps.watches.size).toBe(0);
  });

  it("\"Use my location\" gives up when no fix arrives, and the quiet fix on opening says nothing (spec/app/maps/index.md, \"Story: Use my location\"; spec/app/maps/connection.md, \"Story: Use my location\")", async () => {
    const world = { ...scene(), phone: true };
    world.settings.location = { location: "granted", accuracy: "precise" };
    world.maps.here = undefined;
    const { alpha } = await open(world, withMaps);
    await showMaps(alpha);
    const runtime = maps.runtime(alpha);
    // spec/app/maps/index.md, "Opening Maps with location already allowed and nothing chosen takes one fix quietly, once a visit"
    await until(alpha, runtime, Screen, (s) => s.link.provider !== 0 && s.quiet && s.quietDone);
    // spec/app/maps/connection.md, "\"Use my location\" gives up after 15 seconds without a fix"
    await later(alpha, 16_000);
    await until(alpha, runtime, Screen, (s) => !s.quiet && s.link.locator === "Nobody");
    expect([document.body.textContent?.includes("No location fix arrived."), world.maps.watches.size]).toEqual([false, 0]);
    await press("My location");
    await until(alpha, runtime, Screen, (s) => s.link.locator === "Finder" && !s.quiet);
    await later(alpha, 16_000);
    await until(alpha, runtime, Screen, (s) => s.missedFix && s.link.locator === "Nobody");
    expect([document.body.textContent?.includes("No location fix arrived."), world.maps.watches.size]).toEqual([true, 0]);
  });

  it("A secondary click drops a pin at once, never on the directions (spec/app/maps/index.md, \"Story: Look at a place\")", async () => {
    const world = scene();
    const { alpha } = await open(world, withMaps);
    await showMaps(alpha);
    const runtime = maps.runtime(alpha);
    await until(alpha, runtime, Screen, (s) => s.link.provider !== 0);
    const send = (event: { readonly type: "menuPin"; readonly lat: number; readonly lng: number }) => act(async () => { await runtime.runPromise(Effect.ignore(Effect.flatMap(Screen, (screen) => screen.send(event)))); });
    // spec/app/maps/index.md, "A secondary click, or a menu opened with no finger down, drops a pin there at once"
    await send({ type: "menuPin", lat: 43_731_000, lng: 7_421_000 });
    await until(alpha, runtime, Screen, (s) => s.place !== 0 && !s.pinning);
    expect(document.body.textContent).toContain("43.73100, 7.42100");
    await press("Directions");
    await until(alpha, runtime, Screen, (s) => s.directions);
    const before = await runtime.runPromise(Effect.flatMap(Screen, (screen) => screen.get()));
    await send({ type: "menuPin", lat: 43_732_000, lng: 7_422_000 });
    const after = await runtime.runPromise(Effect.flatMap(Screen, (screen) => screen.get()));
    expect([after.place, after.directions]).toEqual([before.place, true]);
  });

  it("A phone updated from the previous Alpha keeps its saved places (spec/app/maps/places.md, \"Story: Keep my saved places\")", async () => {
    const world = scene();
    const row = (label: string, latitude: number, longitude: number, providerId?: string, providerPlaceId?: string) => ({ label, coordinate: { latitude, longitude }, ...(providerId === undefined ? {} : { providerId, providerPlaceId }) });
    const items = [
      row(" Home ", 43.73, 7.42),
      row("Gallery", 37.795, -122.394, "eliza-cloud-google", "g1"),
      row("", 43.74, 7.43),
      row("Home again", 43.73, 7.42),
      row("Cafe", 43.731, 7.421, "osm", "n1"),
      ...Array.from({ length: 205 }, (_, index) => row(`Place ${index + 1}`, 44 + index / 1000, 7)),
    ];
    localStorage.setItem("alpha.maps.saved-places.v1", JSON.stringify({ version: 1, items }));
    const { alpha } = await open(world, withMaps);
    await showMaps(alpha);
    const runtime = maps.runtime(alpha);
    // spec/app/maps/places.md, "A phone updated from the previous Alpha keeps its saved places"; spec/app/maps/index.md, "A list this version never wrote takes the previous Alpha's places once, and keeps them"
    await until(alpha, runtime, Screen, (s) => s.saved.length === 200 && s.keepable);
    const state = await runtime.runPromise(Effect.flatMap(Screen, (screen) => screen.get()));
    expect(state.saved.slice(0, 3).map((saved) => saved.name)).toEqual(["Home", "Cafe", "Place 1"]);
    await until(alpha, runtime, Screen, () => localStorage.getItem("alpha/maps/saved@1") !== null);
    const written = JSON.parse(localStorage.getItem("alpha/maps/saved@1") ?? "[]") as ReadonlyArray<{ name: string }>;
    expect([written.length, written[0]?.name, localStorage.getItem("alpha.maps.saved-places.v1") === JSON.stringify({ version: 1, items })]).toEqual([200, "Home", true]);
  });

  it("A previous list Alpha cannot read leaves this version's list empty and usable (spec/app/maps/places.md, \"Story: Keep my saved places\")", async () => {
    const world = scene();
    localStorage.setItem("alpha.maps.saved-places.v1", JSON.stringify({ version: 1, items: [{ label: "Home", coordinate: { latitude: "north" } }] }));
    const { alpha } = await open(world, withMaps);
    await showMaps(alpha);
    const runtime = maps.runtime(alpha);
    // spec/app/maps/places.md, "A phone updated from the previous Alpha keeps its saved places": a previous list that cannot be read leaves this version's list empty and usable
    await until(alpha, runtime, Screen, (s) => s.link.provider !== 0);
    await focus("Search Maps");
    await fill("Search Maps", "48.85, 2.35");
    await enter("Search Maps");
    await until(alpha, runtime, Screen, (s) => s.place !== 0 && !s.pinning);
    expect([Boolean(button("Save")), document.body.textContent?.includes("Saved places could not be read.")]).toEqual([true, false]);
  });

  it("A Calendar event hands Maps its place's words, and Back goes back to the event (spec/app/maps/index.md, \"Story: Come from a Calendar event\")", async () => {
    const world = scene();
    const { alpha } = await open(world, only("home", "view:Maps", "view:Calendar"));
    await showMaps(alpha);
    const runtime = maps.runtime(alpha);
    await until(alpha, runtime, Screen, (s) => s.link.provider !== 0);
    // spec/app/maps/index.md, "A query another app hands to Maps opens as a search, never over navigation"
    await act(async () => { await runtime.runPromise(handedOver("harbour", 7)); });
    await until(alpha, runtime, Screen, (s) => s.searching && s.fromEvent === 7 && s.search.status === "Loaded" && s.results === 2);
    // spec/app/maps/index.md, "Back leaves one mode: navigation to its directions, directions to the place, the place to the search, the search to the map"
    await hardware("back");
    await until(alpha, runtime, Screen, (s) => !s.searching && s.fromEvent === 0);
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.at(-1) === "Calendar");
  });
});
