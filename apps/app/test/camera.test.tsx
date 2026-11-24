// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { Machine } from "../gen/app__camera.effect.vibe";
import { requestCapture, type CaptureAnswer } from "../src/camera/camera.vibe";
import camera from "../src/camera/index.tsx";
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

  it("Let Alpha take a photo after owner approval (spec/app/camera/index.md, \"Story: Let Alpha take a photo\")", async () => {
    const world = { ...scene(), phone: true };
    const { alpha } = await open(world, only("home", "view:Camera", "notice"));
    const runtime = camera.runtime(alpha);
    let outcome: Promise<CaptureAnswer> | undefined;
    await drawn(() => { outcome = runtime.runPromise(requestCapture()); });
    await until(alpha, runtime, Machine, (state) => state.phase === "Ready" && state.agent.stage === "Asked" && state.agent.approval.showing);
    expect(world.camera.photos).toHaveLength(0);
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
