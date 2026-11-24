import { type Context, Effect, type Layer, type ManagedRuntime, Stream } from "effect";
import { TestClock } from "effect/testing";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { App } from "../src/App.tsx";
import { type Mount, type Place, mounts as every } from "../src/areas.ts";
import { boot } from "../src/boot.tsx";
import type { Platform } from "../src/platform/platform.vibe";
import type { Alpha } from "../src/runtime/area.tsx";
import { pressButton } from "./fakes/phone.ts";
import type { Scene } from "./fakes/scene.ts";
import { fakeWorld } from "./fakes/world.vibe";

const environment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };

/** `work` under React's act in Node, where happy-dom draws only what act flushes; as it is in a browser, which draws by itself. */
export async function drawn(work: () => unknown) {
  if (environment.IS_REACT_ACT_ENVIRONMENT) await act(async () => { await work(); });
  else await work();
}

/** Run React under act: for a journey in Node, before `open`. */
export function underAct() {
  environment.IS_REACT_ACT_ENVIRONMENT = true;
}

/** Alpha's screens at `places` alone: what a journey passes `open`, so that it loads only what it draws. */
export const only = (...places: Place[]) => every.filter((mount) => places.includes(mount.at));

const closing: (() => Promise<void>)[] = [];
/** What each open Alpha was opened with: the world a journey moves, and the screens its `until` loads. */
const opened = new WeakMap<Alpha, { world?: Scene; mounts: readonly Mount[] }>();

/** Close every Alpha the test opened, and forget what it stored: for `afterEach`. */
export async function closeAll() {
  for (const close of closing.splice(0)) await close();
  localStorage.clear();
}

/**
 * Alpha as main.tsx opens it, over this page's localStorage, the fake world and a clock at the world's time, which
 * the test moves. `mounts` are the screens it draws: every screen of Alpha, or the journey's own. `close` is the
 * process dying.
 */
export async function open(world: Scene, mounts: readonly Mount[] = every) {
  const running = await openOver(fakeWorld(world), mounts);
  opened.set(running.alpha, { world, mounts });
  return running;
}

/** Alpha over `platform`, which a journey with real services builds itself (test/eliza/world.vibe). */
export async function openOver(platform: Layer.Layer<Platform>, mounts: readonly Mount[] = every) {
  const alpha = boot(platform, mounts);
  opened.set(alpha, { mounts });
  const root = createRoot(document.body.appendChild(document.createElement("div")));
  await drawn(async () => {
    root.render(<App alpha={alpha} />);
    await alpha.runtime.runPromise(Effect.void);
  });
  let open = true;
  const close = async () => {
    if (!open) return;
    open = false;
    await drawn(() => root.unmount());
    await alpha.dispose();
  };
  closing.push(close);
  return { alpha, close };
}

/** Wait, with every screen of `alpha` loaded, until the machine `key` names in `runtime` reaches a state `ok` accepts, and React has drawn it. */
export async function until<I, S>(alpha: Alpha, runtime: ManagedRuntime.ManagedRuntime<I, unknown>, key: Context.Key<I, { readonly changes: Stream.Stream<S> }>, ok: (state: S) => boolean) {
  await drawn(async () => {
    await Promise.allSettled((opened.get(alpha)?.mounts ?? []).map((mount) => mount.load()));
    await runtime.runPromise(Effect.flatMap(key, (machine) => Stream.runHead(Stream.filter(machine.changes, ok))));
  });
}

/** Let `ms` pass, in the world and on the clock of `alpha`. */
export const later = (alpha: Alpha, ms: number) => drawn(() => {
  const world = opened.get(alpha)?.world;
  if (world) world.now += ms;
  return alpha.runtime.runPromise(TestClock.adjust(ms));
});

/** Let `ms` pass in the world while no Alpha is open: the next one opens that much later. */
export function asleep(world: Scene, ms: number) {
  world.now += ms;
}

/** The button whose accessible name is `name`, if one is shown. */
export const button = (name: string) => [...document.querySelectorAll("button")].find((found) => (found.getAttribute("aria-label") ?? found.textContent) === name);

export const press = (name: string) => drawn(() => {
  const found = button(name);
  if (!found) throw new Error(`no button ${name}`);
  found.click();
});

/** Press the button named `name` on the sheet or dialog on top, where the page behind it may hold one of the same name. */
export const pressOnTop = (name: string) => drawn(() => {
  const top = [...document.querySelectorAll("[role=dialog]")].at(-1);
  const found = top && [...top.querySelectorAll("button")].find((one) => (one.getAttribute("aria-label") ?? one.textContent) === name);
  if (!found) throw new Error(`no button ${name} on top`);
  found.click();
});

/** Type `text` into the field whose accessible name is `name`, as a person does: React hears the input event. */
export const fill = (name: string, text: string) => drawn(() => {
  const found = [...document.querySelectorAll("input")].find((field) => field.getAttribute("aria-label") === name);
  if (!found) throw new Error(`no field ${name}`);
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(found) as object, "value")?.set?.call(found, text);
  found.dispatchEvent(new Event("input", { bubbles: true }));
});

/** The page is hidden, as when the owner leaves Alpha, or shown again: what `Device.visible` tells. */
export const seen = (visible: boolean) => drawn(() => {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (visible ? "visible" : "hidden") });
  document.dispatchEvent(new Event("visibilitychange"));
});

/** Hand Alpha a hardware button, as the phone does. */
export const hardware = (pressed: "back" | "home") => drawn(() => pressButton(pressed));
