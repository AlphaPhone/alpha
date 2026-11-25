// @vitest-environment happy-dom
import { Effect, Layer } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { App } from "../src/App.tsx";
import { boot } from "../src/boot.tsx";
import type { Platform } from "../src/platform/platform.vibe";

const react = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };

it("Shows recovery before the shell opens (spec/app/startup/recovery.md, \"Story: See that something went wrong, and get out of it\")", async () => {
  const unavailable = Layer.effectContext<Platform, never, never>(Effect.die("unavailable startup service"));
  const alpha = boot(unavailable, []);
  const host = document.body.appendChild(document.createElement("div"));
  const root = createRoot(host);
  const reload = vi.spyOn(window.location, "reload").mockImplementation(() => undefined);
  const previous = react.IS_REACT_ACT_ENVIRONMENT;
  react.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    await act(async () => {
      root.render(<App alpha={alpha} />);
      await alpha.runtime.runPromiseExit(Effect.void);
    });
    // spec/app/startup/recovery.md, "The failure screen stays until the owner's Reload rebuilds the page or its process dies, and a page without WebView stays as it is"
    const dialog = host.querySelector('[role="alertdialog"]');
    const button = [...(dialog?.querySelectorAll("button") ?? [])].find((one) => one.textContent === "Reload");
    expect([dialog?.textContent?.includes("Something went wrong"), button?.disabled, reload.mock.calls.length]).toEqual([true, false, 0]);
    act(() => button?.click());
    expect(reload.mock.calls).toHaveLength(1);
  } finally {
    reload.mockRestore();
    act(() => root.unmount());
    react.IS_REACT_ACT_ENVIRONMENT = previous;
    await alpha.dispose();
    host.remove();
  }
});
