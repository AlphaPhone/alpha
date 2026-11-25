// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { Machine as Library } from "../gen/app__photos.effect.vibe";
import { Machine as Viewer } from "../gen/app__photos__viewer.effect.vibe";
import { photosArea } from "../src/photos/index.tsx";
import { button, closeAll, drawn, hardware, only, open, press, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

it("Allow Photos and browse the library (spec/app/photos/index.md, \"Story: Give Photos access\"; spec/app/photos/index.md, \"Story: Browse the library\"; spec/app/photos/viewer.md, \"Story: Look at a photo or video\"; spec/app/photos/viewer.md, \"Story: Edit a photo or trim a video\")", async () => {
  const world = { ...scene(), phone: true, now: 1795400000000 + 86_400_000 + 240_000 };
  const { alpha } = await open(world, only("home", "view:Photos", "notice"));
  await press("Photos");
  const runtime = photosArea.runtime(alpha);
  await until(alpha, runtime, Library, (state) => state.library.status === "Loaded" && state.rows.length === 1);
  expect([Boolean(button("Camera.jpg")), Boolean(button("Park.jpg"))]).toEqual([true, false]);

  await press("Allow access");
  await until(alpha, runtime, Library, (state) => state.library.status === "Loaded" && state.access.grant === "Granted");
  await press("Show more");
  await until(alpha, runtime, Library, (state) => state.library.status === "Loaded" && state.rows.length === 3);
  // spec/app/photos/index.md, "Story: Browse the library": the Library is headed by day as v121 headed it, counted back from Alpha's time
  expect([...document.querySelectorAll("[data-alpha-app-scroll=photos] section h2")].map((heading) => heading.textContent)).toEqual(["Yesterday"]);

  await press("Park.jpg");
  await until(alpha, runtime, Viewer, (state) => state.read.status === "Loaded");
  await press("Next photo");
  await until(alpha, runtime, Viewer, (state) => state.read.status === "Loaded" && state.read.ticket === 2);
  expect(world.photos.readCount).toBe(2);

  await press("Edit");
  await until(alpha, runtime, Viewer, (state) => state.editing && state.preview.showing);
  await press("Noir");
  await until(alpha, runtime, Viewer, (state) => state.edit.look === "Noir" && state.preview.showing);
  await press("Save copy");
  await until(alpha, runtime, Viewer, (state) => state.save.outcome === "Confirmed");
  expect([world.photos.saves, world.photos.rows.some((item) => item.name === "Camera.jpg")]).toEqual([["noir"], true]);

  await drawn(() => {
    world.photos.access = { scope: "denied", images: "denied", videos: "denied" };
    world.photos.changed();
  });
  await until(alpha, runtime, Library, (state) => state.access.grant === "Denied" && state.library.status === "Loaded" && state.rows.length === 2);
  await until(alpha, runtime, Viewer, (state) => state.open === 0);
  expect([Boolean(button("Camera.jpg")), Boolean(button("Park.jpg")), world.photos.promptCount]).toEqual([true, false, 1]);
  await hardware("back");
  await until(alpha, runtime, Library, (state) => !state.visible);
});

it("Resume an already-sent photo edit from an older viewer record (spec/app/photos/viewer.md, \"A restart forgets the viewer but keeps the save; a save still on its way is no longer trusted, and is looked up\")", async () => {
  const kept = "alpha/app/photos/viewer@1";
  const operationId = "alpha-test-photo-edit";
  localStorage.setItem(kept, JSON.stringify({
    visible: true, secure: false, scope: [], open: 1, openedBy: "Owner", listed: true,
    read: { status: "Loaded", ticket: 1 }, kind: "Still", duration: 0, revision: 1, favourite: false, gone: false,
    zoom: 1, playing: false, position: 0, info: false, editing: true,
    edit: { turns: 1, cropped: false, look: "Original", start: 0, end: 0 },
    preview: { showing: false, revision: 2, shown: 2 }, unavailable: false, refusal: "NoRefusal", replace: false,
    save: { id: 4, outcome: "Sent" }, attempts: 4, lookup: { status: "Idle", ticket: 0 }, found: false, restored: false,
  }));
  localStorage.setItem(kept + ".epoch", "earlier-viewer");
  localStorage.setItem("alpha/photos/edit/4", operationId);

  const world = { ...scene(), phone: true };
  const { alpha } = await open(world, only("home", "view:Photos", "notice"));
  await press("Photos");
  await until(alpha, photosArea.runtime(alpha), Viewer, (state) => state.lookup.status === "Loaded" && state.found &&
    state.attempts === 4 && state.open === 0 && state.origin === "LibraryItem");
  expect(world.photos.editLookups).toEqual([operationId]);
  expect(world.photos.saves).toEqual([]);
  expect(localStorage.getItem(kept + ".epoch")).toBe("earlier-viewer");
  expect(localStorage.getItem("alpha/photos/edit/4")).toBe(operationId);
  expect(localStorage.getItem(kept + ".unreadable")).toBeNull();
});
