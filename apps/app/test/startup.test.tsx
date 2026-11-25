// @vitest-environment happy-dom
import { Effect, Layer } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as Recovery from "../gen/app__startup__recovery.effect.vibe";
import { App } from "../src/App.tsx";
import { boot } from "../src/boot.tsx";
import type { Platform } from "../src/platform/platform.vibe";
import { versions } from "../src/settings/build.ts";
import { closeAll, later, open, underAct, until } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";

underAct();
afterEach(closeAll);

const react = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };

describe("Startup recovery", () => {
  it("Shows recovery before the shell opens with the real version and Switch Home when launcher (spec/app/startup/recovery.md, \"Story: See that something went wrong, and get out of it\")", async () => {
    const unavailable = Layer.effectContext<Platform, never, never>(Effect.die("unavailable startup service"));
    const alpha = boot(unavailable, []);
    const host = document.body.appendChild(document.createElement("div"));
    const root = createRoot(host);
    const reload = vi.spyOn(window.location, "reload").mockImplementation(() => undefined);
    const previous = react.IS_REACT_ACT_ENVIRONMENT;
    react.IS_REACT_ACT_ENVIRONMENT = true;
    document.documentElement.setAttribute("data-alpha-launcher", "");
    try {
      await act(async () => {
        root.render(<App alpha={alpha} />);
        await alpha.runtime.runPromiseExit(Effect.void);
      });
      // spec/app/startup/recovery.md, "The failure screen stays until the owner's Reload rebuilds the page or its process dies, and a page without WebView stays as it is"
      const dialog = host.querySelector('[role="alertdialog"]');
      const buttons = [...(dialog?.querySelectorAll("button") ?? [])];
      const reloadButton = buttons.find((one) => one.textContent === "Reload");
      const switchHomeButton = buttons.find((one) => one.textContent === "Switch Home");
      expect([
        dialog?.textContent?.includes("Something went wrong"),
        dialog?.textContent?.includes(versions().app),
        reloadButton?.disabled,
        Boolean(switchHomeButton),
        reload.mock.calls.length,
      ]).toEqual([true, true, false, true, 0]);
      act(() => reloadButton?.click());
      expect(reload.mock.calls).toHaveLength(1);
    } finally {
      document.documentElement.removeAttribute("data-alpha-launcher");
      reload.mockRestore();
      act(() => root.unmount());
      react.IS_REACT_ACT_ENVIRONMENT = previous;
      await alpha.dispose();
      host.remove();
    }
  });

  it("Runs the resident startup recovery machine through failure and Switch Home (spec/app/startup/recovery.md, \"Story: See that something went wrong, and get out of it\")", async () => {
    const world = { ...scene(), phone: true };
    world.launcher.launcher = true;
    const { alpha } = await open(world);
    await alpha.runtime.runPromise(Recovery.Machine.use((machine) => machine.send({ type: "breaks", side: "HomeSide", kind: "FailedToDraw" }, "Owner")));
    await until(alpha, alpha.runtime, Recovery.Machine, (s) => s.home.page === "Broken" && s.home.failure === "FailedToDraw");
    await alpha.runtime.runPromise(Recovery.Machine.use((machine) => machine.send({ type: "switchHome", launcher: true }, "Owner")));
    await later(alpha, 50);
    await until(alpha, alpha.runtime, Recovery.Machine, (s) => s.switch.status !== "Loading");
    expect(world.settings.opened.length).toBeGreaterThan(0);
  });
});
