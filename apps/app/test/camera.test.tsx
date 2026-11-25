// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { Machine } from "../gen/app__camera.effect.vibe";
import { initial as film, left, nearLimit, remaining, timer } from "../gen/app__camera__recording.ts";
import { requestCapture, type CaptureAnswer } from "../src/camera/camera.vibe";
import camera from "../src/camera/index.tsx";
import { button, closeAll, drawn, hardware, later, only, open, press, seen, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const timerText = () => document.querySelector("[role='timer']")?.textContent;
const running = { ...film, stage: "Running" as const };
const megabytes = 1_048_576;

describe("A recording's time left (spec/app/camera/recording.md, \"Story: Read the clock\")", () => {
  it("counts down to five minutes, and warns only within the last minute", () => {
    expect(left({ ...running, elapsed: 0 })).toBe(300);
    expect(nearLimit({ ...running, elapsed: 239 })).toBe(false);
    expect(nearLimit({ ...running, elapsed: 240 })).toBe(true);
    expect(remaining({ ...running, elapsed: 240 })).toMatchObject({ minutes: 1, seconds: 0 });
    expect(remaining({ ...running, elapsed: 299 })).toMatchObject({ minutes: 0, seconds: 1 });
    expect(timer({ ...running, elapsed: 65 })).toMatchObject({ minutes: 1, seconds: 5 });
  });

  it("estimates 100 MB from the rate so far only after two seconds, rounding up", () => {
    expect(left({ ...running, elapsed: 1, bytes: 90 * megabytes })).toBe(299);
    expect(nearLimit({ ...running, elapsed: 1, bytes: 90 * megabytes })).toBe(false);
    // 80 MB in 120 s leaves 20 MB, 30 s at that rate.
    expect(left({ ...running, elapsed: 120, bytes: 80 * megabytes })).toBe(30);
    expect(nearLimit({ ...running, elapsed: 120, bytes: 80 * megabytes })).toBe(true);
    // 3 bytes in 2 s leaves 104857597 bytes, 69905064.67 s at that rate, rounded up, so time rules.
    expect(left({ ...running, elapsed: 2, bytes: 3 })).toBe(298);
    // 60 MB in 2 s leaves 40 MB, 1.33 s at that rate, rounded up to 2.
    expect(left({ ...running, elapsed: 2, bytes: 60 * megabytes })).toBe(2);
  });

  it("adds nothing to a recording that is not running", () => {
    for (const stage of ["Idle", "Opening", "Stopping", "Checking", "Saved", "Empty", "Broken"] as const) {
      expect(nearLimit({ ...film, stage, elapsed: 290 })).toBe(false);
    }
  });
});

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
    // spec/app/camera/recording.md, "Story: Read the clock"
    expect(timerText()).toBe("0:00");
    await later(alpha, 1000);
    await until(alpha, runtime, Machine, (state) => state.film.elapsed === 1);
    expect(timerText()).toBe("0:01");
    await later(alpha, 240_000);
    await until(alpha, runtime, Machine, (state) => state.film.elapsed === 241);
    expect(timerText()).toBe("4:01 · 0:59 left");
    await press("Stop recording");
    await until(alpha, runtime, Machine, (state) => state.film.stage === "Saved");
    expect(world.camera.savedVideos).toHaveLength(1);
    expect(button("Open last video")).toBeDefined();

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
    expect(button("Open last photo")).toBeDefined();
  });
});
