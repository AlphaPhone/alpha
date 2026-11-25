// @vitest-environment happy-dom
import { Effect, Layer } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { App } from "../src/App.tsx";
import { boot } from "../src/boot.tsx";
import type { Platform } from "../src/platform/platform.vibe";
import { button, closeAll, drawn, only, openOver, press, underAct } from "./alpha.tsx";
import { scene } from "./fakes/scene.ts";
import { fakeWorld } from "./fakes/world.vibe";

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

it("Holds native Home until the phone confirms the signed-in account (spec/app/account/signIn.md, \"Story: Sign in when Alpha needs it\")", async () => {
  const world = { ...scene(), phone: true, signedIn: false, now: 1_700_000_000_000 };
  const startEmail = vi.fn(async () => ({ request: 1, attempt: 1, verdict: "code-on-its-way", expiresAt: world.now + 600_000, resendAt: world.now + 60_000 }));
  const verify = vi.fn(async (input: { attempt: number; code: string }) => {
    if (input.code === "123456") {
      world.signedIn = true;
      return { request: 3, attempt: input.attempt, verdict: "signed-in-as", credentialId: world.voice.credentialId, google: "not-requested" };
    }
    return { request: 2, attempt: input.attempt, verdict: "try-again", retry: "wrong-code" };
  });
  world.voice.startupSignIn = { startEmail, verify };
  underAct();
  try {
    await openOver(fakeWorld(world), only("home", "overlay"), true);
    await vi.waitFor(() => expect(document.querySelector('form[aria-label="Sign in with email"]')).toBeTruthy());
    expect(button("Settings")).toBeUndefined();
    expect(button("Back")).toBeUndefined();
    const enter = async (selector: string, text: string) => {
      const field = document.querySelector<HTMLInputElement>(selector)!;
      await drawn(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(field, text);
        field.dispatchEvent(new Event("input", { bubbles: true }));
      });
    };
    await enter('input[type="email"]', "owner@example.test");
    await press("Send code");
    await vi.waitFor(() => expect(document.querySelector('input[aria-label="Code"]')).toBeTruthy());
    expect(startEmail).toHaveBeenCalledWith({ environment: "production", email: "owner@example.test" });
    await enter('input[aria-label="Code"]', "654321");
    await press("Verify");
    await vi.waitFor(() => expect(document.querySelector('[role="alert"]')?.textContent).toContain("Wrong code"));
    expect(button("Settings")).toBeUndefined();
    await enter('input[aria-label="Code"]', "123456");
    await press("Verify");
    await vi.waitFor(() => expect(button("Settings")).toBeDefined());
    expect(verify).toHaveBeenCalledTimes(2);
  } finally {
    await closeAll();
    react.IS_REACT_ACT_ENVIRONMENT = undefined;
  }
});
