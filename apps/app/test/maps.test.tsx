// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Screen } from "../gen/app__maps.effect.vibe";
import { Machine as Connection } from "../gen/app__maps__connection.effect.vibe";
import { Machine as Guidance } from "../gen/app__maps__guidance.effect.vibe";
import { Machine as Locator } from "../gen/app__maps__location.effect.vibe";
import { Machine as Saved } from "../gen/app__maps__saved.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import maps from "../src/maps/index.tsx";
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

/** The places the results list shows, by name. */
const results = () => [...document.querySelectorAll("section[aria-label=Maps] button")].map((found) => found.getAttribute("aria-label")).filter((name) => name?.startsWith("Harbour"));

describe("Maps on a phone", () => {
  // spec/app/maps/index.md, "Story: Find a place"; spec/app/maps/index.md, "Story: Plan directions and choose a route"; spec/app/maps/guidance.md, "Story: Guide me along the route I started"
  it("Find a place, plan a route and be guided there (spec/app/maps/index.md, \"Story: Find a place\"; spec/app/maps/index.md, \"Story: Plan directions and choose a route\"; spec/app/maps/guidance.md, \"Story: Guide me along the route I started\")", async () => {
    const world = { ...scene(), phone: true };
    const start = { latitude: 43.7300, longitude: 7.4200 };
    world.maps.routes = [cloudRoute("fast", start, harbour.coordinate, 400, 3), cloudRoute("slow", start, harbour.coordinate, 900, 2)];
    const { alpha } = await open(world, withMaps);
    await press("Maps");
    const runtime = maps.runtime(alpha);

    // spec/app/maps/connection.md, "Only the newest read for the bound account installs the provider, and coverage with no provider or no mode is Maps not offered"
    await until(alpha, runtime, Connection, (s) => s.phase === "Installed" && s.account === "u1");
    // spec/app/maps/index.md, "The quiet fix taken on opening centres the map only while nothing is chosen, listed or being located, and its failure says nothing"
    await until(alpha, runtime, Locator, (s) => s.located && s.purpose === "NoPurpose");

    // spec/app/maps/index.md, "Typing waits 350 milliseconds and then searches; Enter searches at once, and Enter again on the same text reuses its answer"
    await fill("Search Maps", "harbour");
    await later(alpha, 350);
    await until(alpha, runtime, Screen, (s) => s.search.status === "Loaded");
    expect(results()).toEqual(["Harbour Cafe", "Harbour Gallery"]);
    // spec/app/maps/connection.md, "Every Maps request goes through eliza's cloud client under its own request key, and a tile comes back as its image"
    const search = world.maps.asked.at(-1);
    expect([search?.path, search?.body, typeof search?.key]).toEqual(["/api/v1/maps/places/search", { query: "harbour", limit: 10, near: start }, "string"]);
    const searched = world.maps.asked.length;
    await enter("Search Maps");
    expect(world.maps.asked.length).toBe(searched);

    // spec/app/maps/index.md, "A place opens from a result, a saved place or a pin, and a result's details are asked for under the next ticket"
    await press("Harbour Cafe");
    await until(alpha, runtime, Screen, (s) => s.details.status === "Loaded");
    expect(world.maps.asked.at(-1)?.path).toBe("/api/v1/maps/places/details");

    // spec/app/maps/index.md, "Locate shows the phone's position, or makes it the starting point in directions"
    await press("Directions");
    await press("Your location");
    await until(alpha, runtime, Screen, (s) => s.route.status === "Loaded");
    const planned = world.maps.asked.length;

    // spec/app/maps/index.md, "The provider's routes are listed in order, and choosing one asks nothing new"
    await press("Alternative 1");
    await until(alpha, runtime, Screen, (s) => s.chosen === 1);
    expect(world.maps.asked.length).toBe(planned);
    await press("Recommended");

    // spec/app/maps/guidance.md, "Start begins a new session from a ready route, and starts the guidance watch"
    await press("Start");
    await until(alpha, runtime, Guidance, (s) => s.phase === "Guiding" && s.fixUsable);
    expect(button("Swap ends")).toBeUndefined();

    // spec/app/maps/guidance.md, "A fix guides only when it is usable, and only for the current session"
    move(world.maps, harbour.coordinate.latitude, harbour.coordinate.longitude, 8, world.now);
    await until(alpha, runtime, Guidance, (s) => s.phase === "Arrived");
    await until(alpha, runtime, Locator, (s) => s.purpose === "NoPurpose");
    expect(world.maps.watches.size).toBe(0);

    // spec/app/maps/guidance.md, "Ending, the provider's retirement, a failed watch or the navigation service ends the session"
    await press("End");
    await until(alpha, runtime, Guidance, (s) => s.phase === "NotGuiding");
    expect(Boolean(button("Start"))).toBe(true);

    // spec/app/maps/index.md, "Back closes one layer at a time: the choice of a start, the directions, the place, then the search"
    await hardware("back");
    await until(alpha, runtime, Screen, (s) => !s.directions && s.choice === "ResultChoice");
    await hardware("back");
    await until(alpha, runtime, Screen, (s) => s.choice === "NoChoice" && s.searching);
    await hardware("back");
    await until(alpha, runtime, Screen, (s) => !s.searching && s.query === "");
    await hardware("back");
    await until(alpha, alpha.runtime, Shell, (s) => s.trail.length === 0);
  });

  // spec/app/maps/connection.md, "A coverage read starts only for a signed-in account under the next generation, and a signed-out one asks nothing"
  it("Signed out, Maps asks Cloud nothing and says to sign in (spec/app/maps/connection.md, \"Story: Keep Cloud Maps on the account that asked for it\")", async () => {
    const world = { ...scene(), phone: true, signedIn: false };
    const { alpha } = await open(world, withMaps);
    await press("Maps");
    const runtime = maps.runtime(alpha);
    await until(alpha, runtime, Connection, (s) => s.phase === "ReadFailed" && s.failure === "SignedOut");
    expect([world.maps.asked, Boolean(button("Retry"))]).toEqual([[], true]);
  });
});

describe("Maps in a browser", () => {
  // spec/app/maps/saved.md, "Story: Keep the places I care about on this phone"
  it("Keep the places I care about on this phone (spec/app/maps/saved.md, \"Story: Keep the places I care about on this phone\")", async () => {
    const world = scene();
    const first = await open(world, withMaps);
    await press("Maps");
    const runtime = maps.runtime(first.alpha);
    await until(first.alpha, runtime, Connection, (s) => s.phase === "Installed");

    // spec/app/maps/index.md, "A place opens from a result, a saved place or a pin, and a result's details are asked for under the next ticket"
    await fill("Search Maps", "43.73, 7.42");
    await enter("Search Maps");
    await until(first.alpha, runtime, Screen, (s) => s.choice === "PinChoice");
    expect(world.maps.asked).toEqual([]);

    // spec/app/maps/saved.md, "A place is saved with a name and a valid identity, and saving it again renames the same entry"
    await press("Save");
    await until(first.alpha, runtime, Saved, (s) => s.items.length === 1);
    await first.close();

    // spec/app/maps/saved.md, "When Alpha opens again the saved places are as they were"
    world.maps.coverage = { ...world.maps.coverage, providerId: "eliza-cloud-google" } as typeof world.maps.coverage;
    const second = await open(world, withMaps);
    await press("Maps");
    const again = maps.runtime(second.alpha);
    await until(second.alpha, again, Saved, (s) => s.items.length === 1);
    expect(Boolean(button("43.73, 7.42"))).toBe(true);

    // spec/app/maps/vocabulary.md, "A Google place is never saved, shared, renamed or copied, and Google guidance is never spoken"
    await until(second.alpha, again, Connection, (s) => s.coverage.kind === "GoogleProvider");
    await fill("Search Maps", "gallery");
    await enter("Search Maps");
    await until(second.alpha, again, Screen, (s) => s.search.status === "Loaded");
    await press("Harbour Gallery");
    await until(second.alpha, again, Screen, (s) => s.details.status === "Loaded");
    expect([Boolean(button("Directions")), Boolean(button("Save"))]).toEqual([true, false]);
  });

  // spec/app/maps/connection.md, "Story: Back off when Maps asks me to wait"
  it("Back off when Maps asks me to wait (spec/app/maps/connection.md, \"Story: Back off when Maps asks me to wait\")", async () => {
    const world = scene();
    const { alpha } = await open(world, withMaps);
    await press("Maps");
    const runtime = maps.runtime(alpha);
    await until(alpha, runtime, Connection, (s) => s.phase === "Installed");

    // spec/app/maps/connection.md, "A refusal asking to wait, for the current generation, pauses every data request until its wait ends"
    world.maps.limited = 120;
    await fill("Search Maps", "harbour");
    await enter("Search Maps");
    await until(alpha, runtime, Screen, (s) => s.search.status === "Failed");
    await until(alpha, runtime, Connection, (s) => s.pausedUntil > world.now);
    const asked = world.maps.asked.length;
    await enter("Search Maps");
    await until(alpha, runtime, Screen, (s) => s.search.status === "Failed");
    expect(world.maps.asked.length).toBe(asked);

    // spec/app/maps/connection.md, "A wait Cloud names is kept when it is at most a day, an allowance reset when at most 400 days, and any other wait is one minute"
    await later(alpha, 120_000);
    await enter("Search Maps");
    await until(alpha, runtime, Screen, (s) => s.search.status === "Loaded" && s.results.length === 2);
  });
});
