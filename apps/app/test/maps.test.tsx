// @vitest-environment happy-dom
import { Effect } from "effect";
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Screen } from "../gen/app__maps.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import maps from "../src/maps/index.tsx";
import type { Alpha } from "../src/runtime/area.tsx";
import { button, closeAll, fill, hardware, later, only, open, press, underAct, until } from "./alpha.tsx";
import { cloudRoute, harbour, move } from "./fakes/maps.ts";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const withMaps = only("home", "view:Maps");

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
    await press("From my location");
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

    // spec/app/maps/index.md, "Coordinates typed into Search drop a pin"
    await focus("Search Maps");
    await fill("Search Maps", "43.73, 7.42");
    await enter("Search Maps");
    await until(first.alpha, runtime, Screen, (s) => s.place !== 0 && !s.pinning);
    expect(world.maps.asked).toEqual([]);

    // spec/app/maps/index.md, "The place on the card is saved under a name, renamed under another, or forgotten"; spec/app/maps/index.md, "A saved list that cannot be read is never written over, and a change is told only once it reads back"
    await fill("Name", "Quay");
    await press("Save");
    await until(first.alpha, runtime, Screen, (s) => s.saved.length === 2 && s.saved[1]?.name === "Quay" && s.notice === "PlaceSaved");
    expect(document.body.textContent).toContain("Place saved on this device.");
    await first.close();

    // spec/app/maps/index.md, "Saved places are kept on the phone, and are what survives a restart"
    world.maps.coverage = { ...world.maps.coverage, providerId: "eliza-cloud-google" } as typeof world.maps.coverage;
    const second = await open(world, withMaps);
    await showMaps(second.alpha);
    const again = maps.runtime(second.alpha);
    await until(second.alpha, again, Screen, (s) => s.saved.length === 2 && s.link.google);
    expect([Boolean(button("Quay")), Boolean(button("Office"))]).toEqual([true, true]);

    // spec/app/maps/connection.md, "Google's content is drawn only on Google's own map, whose only credit is the Google Maps badge"; spec/app/maps/places.md, "At most 200 places are saved: a full list only renames"
    await focus("Search Maps");
    await fill("Search Maps", "gallery");
    await enter("Search Maps");
    await until(second.alpha, again, Screen, (s) => s.search.status === "Loaded");
    await press("Harbour Gallery");
    await until(second.alpha, again, Screen, (s) => s.place !== 0);
    expect([Boolean(button("Directions")), Boolean(button("Save")), Boolean(button("Share"))]).toEqual([true, false, false]);

    // spec/app/maps/index.md, "A route is asked from coordinates or another place, which ends a pending \"Use my location\"": Google's map offers no coordinate prompt
    await press("Directions");
    await until(second.alpha, again, Screen, (s) => s.directions);
    expect([document.querySelector("input[aria-label='Starting point']"), Boolean(button("From Office"))]).toEqual([null, true]);
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
  });
});
