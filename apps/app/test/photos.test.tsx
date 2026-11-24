// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { Machine as Grid } from "../gen/app__photos.effect.vibe";
import { Machine as Viewer } from "../gen/app__photos__viewer.effect.vibe";
import photos from "../src/photos/index.tsx";
import { button, closeAll, drawn, open, press, seen, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const tiles = () => [...document.querySelectorAll("[aria-label=Listed] li button")];
const headings = () => [...document.querySelectorAll("[aria-label=Listed] section h2")].map((one) => one.textContent);
const tap = (index: number) => drawn(() => (tiles()[index] as HTMLElement).click());
const stored = (world: ReturnType<typeof scene>) => world.photos.held.map((one) => `${one.id}${one.favorite ? "*" : ""}${one.trashed ? "-" : ""}`);

/** Alpha on a phone at the world's day, with Photos on screen. */
async function onPhotos(world = { ...scene(), phone: true, now: Date.UTC(2026, 10, 24, 12) }) {
  const running = await open(world);
  const runtime = photos.runtime(running.alpha);
  await press("Photos");
  return { ...running, world, runtime };
}

describe("Photos on a phone", () => {
  it("Give Photos access and browse the library (spec/app/photos/index.md, \"Story: Give Photos access\"; spec/app/photos/index.md, \"Story: Browse the library\")", async () => {
    const { alpha, runtime, world } = await onPhotos();
    // spec/app/photos/index.md, "Without access to the library, Photos lists only Alpha's own captures, and opens no album, selection, dialog or change"
    await until(alpha, runtime, Grid, (s) => s.access.grant === "Unasked" && s.library.status === "Loaded");
    expect([tiles().length, Boolean(button("Select"))]).toEqual([2, false]);
    expect(world.photos.calls).not.toContain("requestLibraryAccess");

    // spec/app/photos/index.md, "Photos asks Android for access only while it lacks it and has not asked before, and never from the lock screen"
    await press("Allow");
    // spec/app/photos/index.md, "What the phone reports about access replaces what Photos believed, and the library is read again"
    await until(alpha, runtime, Grid, (s) => s.access.grant === "Granted" && s.library.status === "Loaded" && s.rows.length === 6);
    expect(world.photos.calls.filter((call) => call === "requestLibraryAccess")).toHaveLength(1);
    expect(headings()).toEqual(["Today", "Yesterday", "Sat, Nov 21", "October 2026"]);

    // spec/app/photos/index.md, "The owner, or the agent, narrows the Library to favourites, videos, a person or a search, without changing it"
    await press("Favorites");
    await until(alpha, runtime, Grid, (s) => s.filter === "Favorites" && s.library.status === "Loaded");
    expect(tiles().length).toBe(2);
    await press("Favorites");
    await press("Videos");
    await until(alpha, runtime, Grid, (s) => s.filter === "Videos" && s.library.status === "Loaded");
    expect(tiles().map((one) => one.getAttribute("aria-label"))).toEqual(["Video, Nov 23, 2026"]);
    await press("Videos");
    await until(alpha, runtime, Grid, (s) => s.filter === "Everything" && s.library.status === "Loaded" && s.rows.length === 6);

    // spec/app/photos/index.md, "A change made outside Photos lists the library again"
    world.photos.held.push({ id: "p6", kind: "image", date: world.now, revision: 1, favorite: false, trashed: false, owned: false, hue: 320 });
    world.photos.changed();
    await until(alpha, runtime, Grid, (s) => s.library.status === "Loaded" && s.rows.length === 7);

    // spec/app/photos/index.md, "Hiding Photos keeps nothing of the library on screen, and showing it reads again"
    await seen(false);
    await seen(true);
    await until(alpha, runtime, Grid, (s) => s.library.status === "Loaded" && s.rows.length === 7);
  });

  it("Select photos, favourite and delete them, and undo the deletion (spec/app/photos/index.md, \"Story: Select photos\")", async () => {
    const world = { ...scene(), phone: true, now: Date.UTC(2026, 10, 24, 12) };
    world.photos.access = { scope: "full", images: "full", videos: "full" };
    const { alpha, runtime } = await onPhotos(world);
    await until(alpha, runtime, Grid, (s) => s.library.status === "Loaded" && s.rows.length === 6);

    // spec/app/photos/index.md, "Selection starts over a grid of items, toggles only items it lists, and has no limit"
    await press("Select");
    await tap(2);
    await tap(4);
    await until(alpha, runtime, Grid, (s) => s.selected.length === 2);
    // spec/app/photos/index.md, "Favouriting, sharing or deleting the selection starts one run of changes of exactly the selection, and ends the selection"; spec/app/photos/index.md, "A request ends as the phone answers it, item by item; when the run is over the grid is read again"
    await press("Add to favorites");
    await until(alpha, runtime, Grid, (s) => !s.selecting && s.job.requests > 0 && s.job.left.length === 0 && s.job.sending.length === 0 && s.library.status === "Loaded" && s.starred.length === 4);
    expect(stored(world)).toEqual(["p1", "p2*", "v1*", "p3", "p4*", "p5*"]);

    await press("Select");
    await tap(0);
    await press("Delete");
    await until(alpha, runtime, Grid, (s) => s.job.left.length === 0 && s.job.sending.length === 0 && s.library.status === "Loaded" && s.rows.length === 5);
    expect(world.photos.calls).toContain("changeMany trash");
    expect(stored(world)[0]).toBe("p1-");
    // spec/app/photos/index.md, "Undo puts back what the deletion moved, at the revision now listed, until Notices says it is gone"
    await press("Undo");
    await until(alpha, runtime, Grid, (s) => s.job.left.length === 0 && s.job.sending.length === 0 && s.library.status === "Loaded" && s.rows.length === 6);
    expect(stored(world)[0]).toBe("p1");
  });

  it("Look at a photo and share it (spec/app/photos/viewer.md, \"Story: Look at a photo or video\"; spec/app/photos/viewer.md, \"Story: Share what I am looking at\")", async () => {
    const world = { ...scene(), phone: true, now: Date.UTC(2026, 10, 24, 12) };
    world.photos.access = { scope: "full", images: "full", videos: "full" };
    const { alpha, runtime } = await onPhotos(world);
    await until(alpha, runtime, Grid, (s) => s.library.status === "Loaded" && s.rows.length === 6);

    // spec/app/photos/viewer.md, "An item opens from what Photos lists, and is read from the phone; from the lock screen only one of that session's captures opens"
    await tap(1);
    await until(alpha, runtime, Viewer, (v) => v.open !== 0 && v.read.status === "Loaded");
    expect(world.photos.calls).toContain("readPermitted");
    // spec/app/photos/viewer.md, "The owner swipes to the next or previous item Photos lists, and on the lock screen only within its session"
    await press("Older");
    await until(alpha, runtime, Viewer, (v) => v.read.status === "Loaded" && v.kind === "Clip");
    expect(Boolean(button("Share video"))).toBe(true);
    // spec/app/photos/index.md, "The Viewer's favourite, share or delete of the item open is a change of that one item, at the revision it showed"
    await press("Share video");
    await until(alpha, runtime, Grid, (s) => s.job.change === "Share" && s.job.left.length === 0 && s.job.sending.length === 0 && s.job.done.length === 1);
    expect(world.photos.shared).toEqual([["v1"]]);
    await press("Add to favorites");
    await until(alpha, runtime, Viewer, (v) => v.favourite);
    expect(stored(world)[2]).toBe("v1*");
    await press("Back from video");
    await until(alpha, runtime, Viewer, (v) => v.open === 0);
  });
});
