// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { Machine as Library } from "../gen/app__photos.effect.vibe";
import { Machine as Viewer } from "../gen/app__photos__viewer.effect.vibe";
import { photosArea } from "../src/photos/index.tsx";
import { button, closeAll, drawn, hardware, open, press, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

it("Allow Photos and browse the library (spec/app/photos/index.md, \"Story: Give Photos access\"; spec/app/photos/index.md, \"Story: Browse the library\"; spec/app/photos/viewer.md, \"Story: Look at a photo or video\"; spec/app/photos/viewer.md, \"Story: Edit a photo or trim a video\")", async () => {
  const world = { ...scene(), phone: true };
  const { alpha } = await open(world);
  await press("Photos");
  const runtime = photosArea.runtime(alpha);
  await until(alpha, runtime, Library, (state) => state.library.status === "Loaded" && state.rows.length === 1);
  expect([Boolean(button("Camera.jpg")), Boolean(button("Park.jpg"))]).toEqual([true, false]);

  await press("Allow access");
  await until(alpha, runtime, Library, (state) => state.library.status === "Loaded" && state.access.grant === "Granted");
  await press("Show more");
  await until(alpha, runtime, Library, (state) => state.library.status === "Loaded" && state.rows.length === 3);

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
