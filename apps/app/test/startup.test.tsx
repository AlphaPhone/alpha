// @vitest-environment happy-dom
import { Effect, Layer } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { App } from "../src/App.tsx";
import { Machine as Access } from "../gen/app__startup__access.effect.vibe";
import { Machine as Layers } from "../gen/app__shell__layers.effect.vibe";
import { Machine as Shell } from "../gen/app__shell.effect.vibe";
import { boot } from "../src/boot.tsx";
import type { Platform } from "../src/platform/platform.vibe";
import { button, closeAll, drawn, hardware, later, only, openOver, press, underAct, until } from "./alpha.tsx";
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
  const startEmail = vi.fn(() => Promise.resolve({ request: 1, attempt: 1, verdict: "code-on-its-way", expiresAt: world.now + 600_000, resendAt: world.now + 60_000 }));
  const verify = vi.fn((input: { attempt: number; code: string }) => {
    if (input.code === "123456") {
      world.signedIn = true;
      return Promise.resolve({ request: 3, attempt: input.attempt, verdict: "signed-in-as", credentialId: world.voice.credentialId, google: "not-requested" });
    }
    return Promise.resolve({ request: 2, attempt: input.attempt, verdict: "try-again", retry: "wrong-code" });
  });
  world.voice.startupSignIn = { startEmail, verify };
  underAct();
  try {
    localStorage.setItem("alpha:startup-permission-walkthrough:v1", JSON.stringify({ version: 4, status: "completed", step: 7 }));
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

it("Shows native Access after sign-in and keeps the owner's place through restart (spec/app/startup/access.md, \"Story: Walk through each access in order\")", async () => {
  const world = { ...scene(), phone: true, signedIn: true };
  world.settings.permissionStates.notifications = "prompt";
  world.settings.permissionReplies.notifications = "denied";
  world.settings.permissionStates.camera = "prompt";
  world.settings.permissionReplies.camera = "granted";
  const dialog = () => document.querySelector('[role="dialog"]');
  const step = (number: number) => vi.waitFor(() => expect(dialog()?.textContent).toContain(`Step ${number} of 7`));
  underAct();
  try {
    const first = await openOver(fakeWorld(world), only("home", "overlay"), true);
    await step(1);
    expect(button("Settings")).toBeUndefined();
    expect(world.settings.permissionRequests).toEqual([]);
    await drawn(() => first.alpha.runtime.runPromise(Layers.use((work) =>
      work.send({ type: "openLayer", id: "covered-startup", kind: "DialogLayer", covers: true }))));
    await vi.waitFor(() => expect(dialog()?.textContent ?? "").not.toContain("Step 1 of 7"));
    expect(button("Settings")).toBeUndefined();
    await hardware("back");
    await step(1);
    await hardware("back");
    await step(1);
    await vi.waitFor(() => expect(button("Allow")).toBeDefined());
    await press("Allow");
    await vi.waitFor(() => expect(world.settings.permissionRequests).toEqual(["notifications"]));
    await vi.waitFor(() => expect(button("Skip")).toBeDefined());
    await press("Skip");
    await step(2);
    await first.close();

    world.settings.permissionStates.notifications = "prompt-with-rationale";
    await openOver(fakeWorld(world), only("home", "overlay"), true);
    await step(2);
    await vi.waitFor(() => expect(button("Skip")).toBeDefined());
    await press("Skip");
    await step(3);
    await vi.waitFor(() => expect(button("Allow")).toBeDefined());
    await press("Allow");
    for (let number = 4; number <= 7; ++number) {
      await step(number);
      await vi.waitFor(() => expect(button("Skip")).toBeDefined());
      await press("Skip");
    }
    await vi.waitFor(() => expect(button("Settings")).toBeDefined());
    expect(dialog()).toBeNull();
    expect(world.settings.permissionRequests).toEqual(["notifications", "camera"]);
  } finally {
    await closeAll();
    react.IS_REACT_ACT_ENVIRONMENT = undefined;
  }
});

it("Stops the Alpha image Access walkthrough at its first ungranted permission (spec/app/startup/access.md, \"Story: Walk through each access in order\")", async () => {
  const world = { ...scene(), phone: true, image: true, signedIn: true };
  world.settings.hostFacts.startupPermissionDefaults = true;
  world.settings.permissionStates.notifications = "granted";
  world.settings.permissionStates.camera = "prompt";
  world.voice.permission = "granted";
  underAct();
  try {
    await openOver(fakeWorld(world), only("home", "overlay"), true);
    const dialog = () => document.querySelector('[role="dialog"]');
    await vi.waitFor(() => {
      expect(dialog()?.textContent).toContain("Step 3 of 7");
      expect(dialog()?.querySelector('[aria-current="step"]')?.textContent).toContain("Camera");
    });
    expect(button("Allow")).toBeDefined();
    expect(button("Settings")).toBeUndefined();
    expect(world.settings.permissionRequests).toEqual([]);
  } finally {
    await closeAll();
    react.IS_REACT_ACT_ENVIRONMENT = undefined;
  }
});

it("Shows All set only for the account result that calls for it (spec/app/startup/access.md, \"Story: Hear that all is set\")", async () => {
  const world = { ...scene(), phone: true, signedIn: true };
  underAct();
  try {
    localStorage.setItem("alpha:startup-permission-walkthrough:v1", JSON.stringify({ version: 4, status: "completed", step: 7 }));
    const { alpha } = await openOver(fakeWorld(world), only("home", "overlay"), true);
    await vi.waitFor(() => expect(button("Settings")).toBeDefined());
    const finishForNewAccount = () => drawn(() => alpha.runtime.runPromise(Access.use((walkthrough) => Effect.gen(function* () {
      yield* walkthrough.send({ type: "signedOut" }, "Owner");
      yield* walkthrough.send({ type: "welcome", created: true, now: world.now }, "Owner");
    }))));
    const heading = () => document.querySelector('[role="dialog"] h2');
    await finishForNewAccount();
    await vi.waitFor(() => expect(heading()?.textContent).toBe("All set"));
    expect(heading()).toBe(document.activeElement);
    expect(button("Settings")).toBeUndefined();
    await press("Done");
    await vi.waitFor(() => expect(button("Settings")).toBeDefined());

    await finishForNewAccount();
    await vi.waitFor(() => expect(heading()?.textContent).toBe("All set"));
    await hardware("back");
    await vi.waitFor(() => expect(button("Settings")).toBeDefined());
  } finally {
    await closeAll();
    react.IS_REACT_ACT_ENVIRONMENT = undefined;
  }
});

it("Shows chat at once on the assistant-only surface, and elsewhere a white cover until Home is whole (spec/app/startup/index.md, \"The assistant-only surface shows chat and close, and mock mode's banner, and nothing of Home\"; spec/app/startup/index.md, \"Until the connection has resolved, Home shows only the Alpha mark\")", async () => {
  const cover = () => document.querySelector('[role="status"][aria-label="Loading Alpha"]');
  underAct();
  try {
    const alone = { ...scene(), phone: true };
    alone.launcher.assistant = true;
    let homeUncovered = false;
    const watching = new MutationObserver(() => {
      if (!cover() && (document.querySelector("[data-alpha-home-layer]")?.childElementCount ?? 0) > 0) homeUncovered = true;
    });
    watching.observe(document.body, { subtree: true, childList: true, attributes: true });
    const assistant = await openOver(fakeWorld(alone), only("home", "assistant"));
    await until(assistant.alpha, assistant.alpha.runtime, Shell, () => true);
    // spec/app/startup/index.md, "The assistant-only surface shows chat and close, and mock mode's banner, and nothing of Home": chat does not wait behind the cover for Home to settle, with no time passing, and no frame shows Home without the cover.
    await vi.waitFor(() => {
      expect(document.querySelector("[data-alpha-assistant-host]")?.childElementCount).toBeGreaterThan(0);
      expect(cover()).toBeNull();
    }, { timeout: 5_000 });
    watching.disconnect();
    expect([homeUncovered, document.querySelector("[data-alpha-home-layer]")?.childElementCount ?? 0]).toEqual([false, 0]);
    await closeAll();

    // spec/app/startup/index.md, "Until the connection has resolved, Home shows only the Alpha mark": on the launcher an owner who keeps Dark sees the same white cover, and it stays until Home has drawn.
    localStorage.setItem("alpha.appearance", JSON.stringify({ theme: "Dark", legible: false }));
    const { alpha } = await openOver(fakeWorld({ ...scene(), phone: true }), only("home", "assistant"));
    await until(alpha, alpha.runtime, Shell, () => true);
    await vi.waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(true), { timeout: 5_000 });
    expect(cover()?.classList.contains("light")).toBe(true);
    await later(alpha, 2500);
    await vi.waitFor(() => expect(cover()).toBeNull());
  } finally {
    await closeAll();
    document.documentElement.classList.remove("dark");
    react.IS_REACT_ACT_ENVIRONMENT = undefined;
  }
});

it("Returns from Android Wi-Fi settings to the sign-in chooser (spec/app/account/signIn.md, \"Story: Sign in when Alpha needs it\")", async () => {
  const world = { ...scene(), phone: true, signedIn: false };
  world.settings.connectivity = { online: false, validated: false, captivePortal: false, ssid: null };
  underAct();
  try {
    await openOver(fakeWorld(world), only("home", "overlay"), true);
    const notice = () => document.querySelector('[aria-label="Sign-in connection"]');
    await vi.waitFor(() => expect(notice()?.textContent).toContain("You’re offline. Connect to Wi-Fi to sign in."));
    expect(button("Send code")?.disabled).toBe(true);
    expect(button("Settings")).toBeUndefined();
    await press("Open Wi-Fi settings");
    await vi.waitFor(() => expect(world.settings.opened).toEqual(["wifi"]));
    expect(notice()?.querySelector('[role="alert"]')).toBeNull();

    world.settings.connectivity = { online: true, validated: false, captivePortal: true, ssid: "captive" };
    await drawn(() => window.dispatchEvent(new Event("focus")));
    await vi.waitFor(() => expect(notice()?.textContent).toContain("Android couldn’t verify internet access."));
    expect(button("Send code")?.disabled).toBe(false);

    world.settings.facts.wifiActive = false;
    await drawn(() => window.dispatchEvent(new Event("focus")));
    await vi.waitFor(() => expect(notice()?.textContent).toContain("Sign-in isn’t using Wi-Fi. Android couldn’t verify internet access."));
    world.settings.connectivity = { online: true, validated: true, captivePortal: false, ssid: null };
    await drawn(() => window.dispatchEvent(new Event("focus")));
    await vi.waitFor(() => expect(notice()?.textContent).toContain("You can use mobile data or connect to Wi-Fi."));
    expect(button("Send code")?.disabled).toBe(false);

    world.settings.facts.wifiActive = true;
    world.settings.connectivity = { online: true, validated: true, captivePortal: false, ssid: "home" };
    await drawn(() => window.dispatchEvent(new Event("focus")));
    await vi.waitFor(() => expect(notice()).toBeNull());
    expect(button("Send code")?.disabled).toBe(false);
    expect(button("Settings")).toBeUndefined();
  } finally {
    await closeAll();
    react.IS_REACT_ACT_ENVIRONMENT = undefined;
  }
});
