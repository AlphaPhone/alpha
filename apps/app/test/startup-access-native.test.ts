// @vitest-environment happy-dom
import { ManagedRuntime, Option } from "effect";
import { expect, it } from "vitest";
import { SystemSettings } from "../src/platform/systemSettings.vibe";
import { scene } from "./fakes/scene.ts";
import { fakeWorld } from "./fakes/world.vibe";

// spec/app/startup/access.md, "Story: Allow, or go to Android's Settings"
it("Reads Android requestability and only asks the selected Access permission", async () => {
  const world = { ...scene(), phone: true };
  world.settings.permissionStates.camera = "prompt";
  world.settings.permissionStates.notifications = "denied";
  world.settings.permissionReplies.camera = "denied";
  const runtime = ManagedRuntime.make(fakeWorld(world));
  try {
    const read = await runtime.runPromise(SystemSettings.use((settings) => settings.startupAccess("CameraAccess")));
    expect(Option.getOrUndefined(read)).toEqual({ grant: "Unasked", on: true, requestable: true });
    expect(world.settings.permissionRequests).toEqual([]);

    const declined = await runtime.runPromise(SystemSettings.use((settings) => settings.askStartupAccess("CameraAccess")));
    expect(Option.getOrUndefined(declined)).toEqual({ grant: "Denied", on: true, requestable: false });
    await runtime.runPromise(SystemSettings.use((settings) => settings.askStartupAccess("CameraAccess")));
    expect(world.settings.permissionRequests).toEqual(["camera"]);

    const off = await runtime.runPromise(SystemSettings.use((settings) => settings.askStartupAccess("NotificationsAccess")));
    expect(Option.getOrUndefined(off)?.requestable).toBe(false);
    expect(world.settings.permissionRequests).toEqual(["camera"]);
    expect(world.settings.opened).toEqual([]);
  } finally {
    await runtime.dispose();
  }
});

// spec/app/startup/access.md, "Story: Allow, or go to Android's Settings"
it("Leaves Android permission prompts unavailable on the browser", async () => {
  const world = scene();
  const runtime = ManagedRuntime.make(fakeWorld(world));
  try {
    const answer = await runtime.runPromise(SystemSettings.use((settings) => settings.askStartupAccess("CameraAccess")));
    expect(Option.isNone(answer)).toBe(true);
    expect(world.settings.permissionRequests).toEqual([]);
  } finally {
    await runtime.dispose();
  }
});
