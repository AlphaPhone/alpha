import { type Context, Effect, Layer, type ManagedRuntime, Stream } from "effect";
import * as KeyValueStore from "effect/persistence/KeyValueStore";
import { TestClock } from "effect/testing";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { App } from "../src/App.tsx";
import { areas } from "../src/areas.ts";
import { boot } from "../src/boot.tsx";
import type { Platform } from "../src/platform/platform.ts";
import type { Alpha } from "../src/runtime/area.tsx";
import type { Scene } from "./fakes/scene.ts";
import { fakeWorld } from "./fakes/world.vibe";

const environment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };

/** `work` under React's act in Node, where happy-dom draws only what act flushes; as it is in a browser, which draws by itself. */
async function drawn(work: () => unknown) {
  if (environment.IS_REACT_ACT_ENVIRONMENT) await act(async () => { await work(); });
  else await work();
}

/** Run React under act: for a journey in Node, before `open`. */
export function underAct() {
  environment.IS_REACT_ACT_ENVIRONMENT = true;
}

const closing: (() => Promise<void>)[] = [];

/** Close every Alpha the test opened, and forget what it stored: for `afterEach`. */
export async function closeAll() {
  for (const close of closing.splice(0)) await close();
  localStorage.clear();
}

/** This page's localStorage, where Alpha keeps its machines. */
export const stored = KeyValueStore.layerStorage(() => localStorage);

/** Alpha as main.tsx opens it, over this page's localStorage, the fake world and a clock the test moves. `close` is the process dying. */
export function open(world: Scene) {
  return openOver(Layer.merge(fakeWorld(world, stored), TestClock.layer()));
}

/** Alpha over `platform`, which a journey with real services builds itself (test/eliza/world.vibe). */
export async function openOver(platform: Layer.Layer<Platform>) {
  const alpha = boot(platform);
  const root = createRoot(document.body.appendChild(document.createElement("div")));
  await drawn(() => root.render(<App alpha={alpha} />));
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

/** Wait, with every area's screen loaded, until the machine `key` names reaches a state `ok` accepts, and React has drawn it. */
export async function until<I, S>(runtime: ManagedRuntime.ManagedRuntime<I, unknown>, key: Context.Key<I, { readonly changes: Stream.Stream<S> }>, ok: (state: S) => boolean) {
  await drawn(async () => {
    await Promise.all([...Object.values(areas).map((load) => load()), import("../src/ask/index.tsx")]);
    await runtime.runPromise(Effect.flatMap(key, (machine) => Stream.runHead(Stream.filter(machine.changes, ok))));
  });
}

/** Move the clock the test controls on by `ms`. */
export const later = (alpha: Alpha, ms: number) => drawn(() => alpha.runtime.runPromise(TestClock.adjust(ms)));

/** The button whose accessible name is `name`, if one is shown. */
export const button = (name: string) => [...document.querySelectorAll("button")].find((found) => (found.getAttribute("aria-label") ?? found.textContent) === name);

export const press = (name: string) => drawn(() => {
  const found = button(name);
  if (!found) throw new Error(`no button ${name}`);
  found.click();
});

/** Type `text` into the field whose accessible name is `name`, as a person does: React hears the input event. */
export const fill = (name: string, text: string) => drawn(() => {
  const found = [...document.querySelectorAll("input")].find((field) => field.getAttribute("aria-label") === name);
  if (!found) throw new Error(`no field ${name}`);
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(found) as object, "value")?.set?.call(found, text);
  found.dispatchEvent(new Event("input", { bubbles: true }));
});

/** Hand Alpha a hardware button, as the phone does. */
export const hardware = (world: Scene, pressed: "back" | "home") => drawn(() => world.buttons.dispatchEvent(new CustomEvent("press", { detail: pressed })));
