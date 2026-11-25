// @vitest-environment happy-dom
import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";
import { Machine } from "../gen/app__camera.effect.vibe";
import { Machine as Library } from "../gen/app__photos.effect.vibe";
import { Machine as Viewer } from "../gen/app__photos__viewer.effect.vibe";
import { requestCapture, type CaptureAnswer } from "../src/camera/camera.vibe";
import camera from "../src/camera/index.tsx";
import { photosArea } from "../src/photos/index.tsx";
import { button, closeAll, drawn, hardware, later, only, open, press, seen, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

describe("Camera on a phone", () => {
  it("Frame the shot and take photos and videos (spec/app/camera/index.md, \"Story: Frame the shot\")", async () => {
    const world = { ...scene(), phone: true };
    const { alpha } = await open(world, only("home", "view:Camera", "notice"));
    const runtime = camera.runtime(alpha);
    await press("Camera");
    await until(alpha, runtime, Machine, (state) => state.phase === "Ready");

    await press("Framing grid");
    await until(alpha, runtime, Machine, (state) => state.grid);
    await press("Aspect ratio 4:3");
    await until(alpha, runtime, Machine, (state) => state.phase === "Ready" && state.wide);
    expect(world.camera.preview?.captureAspectRatio).toBe("16:9");
    await press("Timer off");
    await press("Take photo");
    await until(alpha, runtime, Machine, (state) => state.countdown === 3);
    expect(world.camera.photos).toHaveLength(0);
    await later(alpha, 3000);
    await until(alpha, runtime, Machine, (state) => state.last > 0 && state.shot === 0);
    expect(world.camera.photos).toMatchObject([{ saveToGallery: true, thumbnailOnly: true }]);

    // spec/app/camera/index.md, "Story: Take photos and videos"
    await press("Video mode");
    await until(alpha, runtime, Machine, (state) => state.mode === "Video");
    await press("Record video");
    await until(alpha, runtime, Machine, (state) => state.film.stage === "Running");
    await press("Stop recording");
    await until(alpha, runtime, Machine, (state) => state.film.stage === "Saved");
    expect(world.camera.savedVideos).toHaveLength(1);

    // spec/app/camera/index.md, "Story: Leave and come back"
    await seen(false);
    await until(alpha, runtime, Machine, (state) => !state.showing && state.phase === "Off");
    await seen(true);
    await until(alpha, runtime, Machine, (state) => state.phase === "Ready");
    await hardware("home");
    await until(alpha, runtime, Machine, (state) => !state.showing && state.phase === "Off");
  });

  it.each(["photo", "video"] as const)("Open the last owned %s without library access (spec/app/camera/index.md, \"The last capture opens in Photos\")", async (kind) => {
    const world = { ...scene(), phone: true };
    const { alpha } = await open(world, only("home", "view:Camera", "view:Photos", "notice"));
    const runtime = camera.runtime(alpha);
    await press("Camera");
    await until(alpha, runtime, Machine, (state) => state.phase === "Ready");
    if (kind === "video") {
      await press("Video mode");
      await until(alpha, runtime, Machine, (state) => state.mode === "Video");
      await press("Record video");
      await until(alpha, runtime, Machine, (state) => state.film.stage === "Running");
      await press("Stop recording");
      await until(alpha, runtime, Machine, (state) => state.film.stage === "Saved");
    } else {
      await press("Take photo");
      await until(alpha, runtime, Machine, (state) => state.last > 0 && state.shot === 0 && world.camera.photos.length === 1);
    }

    const playback = "https://localhost/_alpha_video_/capture.mp4";
    world.photos.rows.unshift({
      id: kind === "video" ? "m:external_primary:v:1" : "m:external_primary:i:1",
      name: kind === "video" ? "Owned clip.mp4" : "Owned still.jpg", owned: true,
      kind: kind === "video" ? "video" : "image", image: world.photos.rows[0]?.image ?? "",
      width: 1280, height: 720, size: 10_000, date: 1795401800000, revision: "owned-capture",
      ...(kind === "video" ? { path: playback, duration: 1 } : {}),
    });
    await press("Open last capture in Photos");
    await until(alpha, photosArea.runtime(alpha), Viewer, (state) => state.read.status === "Loaded");
    if (kind === "video") expect(document.querySelector("video")?.getAttribute("src")).toBe(playback);
    else expect(document.querySelector('img[alt="Owned still.jpg"]')).not.toBeNull();
    expect(world.photos.promptCount).toBe(0);
  });

  it("An aggregate camera URI cannot choose a permitted row on another volume (spec/app/camera/index.md, \"The last capture opens in Photos\")", async () => {
    const world = { ...scene(), phone: true };
    world.photos.access = { scope: "full", images: "full", videos: "full" };
    const { alpha } = await open(world, only("home", "view:Camera", "view:Photos", "notice"));
    const runtime = camera.runtime(alpha);
    await press("Camera");
    await until(alpha, runtime, Machine, (state) => state.phase === "Ready");
    await press("Take photo");
    await until(alpha, runtime, Machine, (state) => state.last > 0 && state.shot === 0 && world.camera.photos.length === 1);

    world.photos.rows.unshift({
      id: "m:a0b1-c2d3:i:1", name: "Different still.jpg", owned: false, kind: "image", image: "",
      width: 1280, height: 720, size: 10_000, date: 1795401800000, revision: "different-capture",
    });
    await press("Open last capture in Photos");
    await until(alpha, photosArea.runtime(alpha), Library, (state) => state.visible && state.library.status === "Loaded" && state.access.grant === "Granted");
    expect([Boolean(button("Different still.jpg")), world.photos.readCount]).toEqual([true, 1]);
    expect((await photosArea.runtime(alpha).runPromise(Effect.flatMap(Viewer, (viewer) => viewer.get()))).open).toBe(0);
  });

  it.each(["photo", "video"] as const)("Open the exact owned %s with full Photos access (spec/app/camera/index.md, \"The last capture opens in Photos\")", async (kind) => {
    const world = { ...scene(), phone: true };
    world.photos.access = { scope: "full", images: "full", videos: "full" };
    const { alpha } = await open(world, only("home", "view:Camera", "view:Photos", "notice"));
    const runtime = camera.runtime(alpha);
    await press("Camera");
    await until(alpha, runtime, Machine, (state) => state.phase === "Ready");

    if (kind === "video") {
      await press("Video mode");
      await until(alpha, runtime, Machine, (state) => state.mode === "Video");
      await press("Record video");
      await until(alpha, runtime, Machine, (state) => state.film.stage === "Running");
      await press("Stop recording");
      await until(alpha, runtime, Machine, (state) => state.film.stage === "Saved");
    } else {
      await press("Take photo");
      await until(alpha, runtime, Machine, (state) => state.last > 0 && state.shot === 0 && world.camera.photos.length === 1);
    }

    const playback = "https://localhost/_alpha_video_/owned.mp4";
    const fixture = {
      kind: kind === "video" ? "video" : "image", image: world.photos.rows[0]?.image ?? "",
      width: 1280, height: 720, size: 10_000, date: 1795401800000, revision: "exact-capture",
      ...(kind === "video" ? { path: playback, duration: 1 } : {}),
    };
    world.photos.rows.unshift({
      ...fixture, id: kind === "video" ? "m:a0b1-c2d3:v:1" : "m:a0b1-c2d3:i:1",
      name: "Different volume", owned: false, path: "https://localhost/_alpha_video_/other.mp4",
    });
    world.photos.rows.push({
      ...fixture, id: kind === "video" ? "m:external_primary:v:1" : "m:external_primary:i:1",
      name: "Just captured", owned: true,
    });

    await press("Open last capture in Photos");
    const photos = photosArea.runtime(alpha);
    await until(alpha, photos, Viewer, (state) => state.read.status === "Loaded");
    if (kind === "video") expect(document.querySelector("video")?.getAttribute("src")).toBe(playback);
    else expect(document.querySelector('img[alt="Just captured"]')).not.toBeNull();
    expect(world.photos.readCount).toBe(2);
  });

  it("Open Camera’s exact capture beyond the first Photos page (spec/app/photos/index.md, \"Only the newest read's answer is shown, only while Photos is showing, and a further page only adds older items\")", async () => {
    const world = { ...scene(), phone: true };
    world.photos.access = { scope: "full", images: "full", videos: "full" };
    const selected = world.photos.rows.find((item) => item.owned);
    if (selected === undefined) throw new Error("The Camera album has no capture");
    selected.date = 1795399000000;
    selected.mutationRevision = "last-capture";
    const mutations: string[] = [];
    world.photos.changeMany = async ({ operation, items }) => {
      if (items.length !== 1 || items[0]?.id !== selected.id || items[0]?.revision !== selected.mutationRevision
        || (operation !== "favorite" && operation !== "unfavorite")) throw new Error("Wrong photo or revision");
      mutations.push(operation);
      selected.mutationRevision = operation;
      selected.favorite = operation === "favorite";
      const status = selected.favorite ? "favorited" : "unfavorited";
      return { status: "complete", outcomes: [{ id: selected.id, status, item: selected }] };
    };
    world.photos.rows.splice(world.photos.rows.indexOf(selected), 1);
    world.photos.rows.push(selected);

    const { alpha } = await open(world, only("home", "view:Camera", "view:Photos", "notice"));
    const runtime = camera.runtime(alpha);
    const library = photosArea.runtime(alpha);
    await press("Camera");
    await until(alpha, runtime, Machine, (state) => state.phase === "Ready" && state.last > 0);
    await press("Open last capture in Photos");
    await until(alpha, library, Viewer, (state) => state.read.status === "Loaded");
    expect(document.querySelector('img[alt="Camera.jpg"]')).not.toBeNull();
    expect(world.photos.readCount).toBe(1);

    // spec/app/photos/index.md, "The Viewer's favourite, share or delete of the item open is a change of that one item, at the revision it showed"
    await press("Favorite");
    await until(alpha, library, Viewer, (state) => state.favourite);
    await until(alpha, library, Library, (state) => state.library.status === "Loaded" && state.job.done.length === 1 && state.cameraItem > 0);
    await press("Remove from favorites");
    await until(alpha, library, Viewer, (state) => !state.favourite);
    expect(mutations).toEqual(["favorite", "unfavorite"]);

    // spec/app/photos/viewer.md, "Back from a Camera capture returns to Camera"
    await press("Info");
    await until(alpha, library, Viewer, (state) => state.info);
    await hardware("back");
    await until(alpha, library, Viewer, (state) => !state.info && state.open !== 0);

    await press("Back to Camera");
    await until(alpha, runtime, Machine, (state) => state.showing && state.phase === "Ready");
    await press("Open last capture in Photos");
    await until(alpha, library, Viewer, (state) => state.read.status === "Loaded" && state.origin === "CameraCapture");
    await hardware("back");
    await until(alpha, runtime, Machine, (state) => state.showing && state.phase === "Ready");
    await hardware("back");
    await until(alpha, runtime, Machine, (state) => !state.showing);

    await press("Photos");
    await until(alpha, library, Library, (state) => state.visible && state.library.status === "Loaded" && state.rows.length === 2);
    expect(button("Camera.jpg")).toBeUndefined();
    await press("Show more");
    await until(alpha, library, Library, (state) => state.library.status === "Loaded" && state.rows.length === 3);
    await press("Camera.jpg");
    await until(alpha, library, Viewer, (state) => state.read.status === "Loaded" && state.origin === "LibraryItem");
    await press("Back to photos");
    await until(alpha, library, Viewer, (state) => state.open === 0);
    expect(button("Camera.jpg")).toBeDefined();
  });

  it("Close the off-page Camera viewer when the exact content changes (spec/app/photos/index.md, \"The Viewer's favourite, share or delete of the item open is a change of that one item, at the revision it showed\")", async () => {
    const world = { ...scene(), phone: true };
    world.photos.access = { scope: "full", images: "full", videos: "full" };
    const capture = world.photos.rows.find((item) => item.owned);
    if (capture === undefined) throw new Error("The Camera album has no capture");
    capture.date = 1795399000000;
    world.photos.rows.splice(world.photos.rows.indexOf(capture), 1);
    world.photos.rows.push(capture);
    const { alpha } = await open(world, only("home", "view:Camera", "view:Photos", "notice"));
    const library = photosArea.runtime(alpha);
    await press("Camera");
    await until(alpha, camera.runtime(alpha), Machine, (state) => state.phase === "Ready" && state.last > 0);
    await press("Open last capture in Photos");
    await until(alpha, library, Viewer, (state) => state.read.status === "Loaded");
    await drawn(() => {
      capture.size += 1;
      capture.mutationRevision = "replaced-capture";
      world.photos.changed();
    });
    await until(alpha, library, Library, (state) => state.visible && state.library.status === "Loaded" && state.cameraItem === 0);
    await until(alpha, library, Viewer, (state) => state.open === 0);
    expect(button("Camera.jpg")).toBeUndefined();
  });

  it("Let Alpha take a photo after owner approval (spec/app/camera/index.md, \"Story: Let Alpha take a photo\")", async () => {
    const world = { ...scene(), phone: true };
    const { alpha } = await open(world, only("home", "view:Camera", "notice"));
    const runtime = camera.runtime(alpha);
    let outcome: Promise<CaptureAnswer> | undefined;
    await drawn(() => { outcome = runtime.runPromise(requestCapture("front")); });
    await until(alpha, runtime, Machine, (state) => state.phase === "Ready" && state.agent.stage === "Asked" && state.agent.approval.showing);
    expect(world.camera.photos).toHaveLength(0);
    expect(world.camera.preview?.direction).toBe("front");
    await drawn(() => {
      const panel = document.querySelector("[aria-label='Camera request']");
      const approve = [...(panel?.querySelectorAll("button") ?? [])].find((control) => control.textContent === "Take photo");
      if (!approve) throw new Error("The Camera request did not offer approval");
      approve.click();
    });
    await until(alpha, runtime, Machine, (state) => state.agent.stage === "Over");
    expect(await outcome).toMatchObject({ result: "Taken", media: { libraryId: "image-1" } });
    expect(world.camera.photos).toHaveLength(1);
    expect(button("Open last capture in Photos")).toBeDefined();
  });
});
