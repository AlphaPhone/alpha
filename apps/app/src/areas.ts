import type { View } from "../gen/app__shell.ts";
import type { Area } from "./runtime/area.tsx";
import home from "./home/index.tsx";

/**
 * Where a screen is drawn. `view:<View>` is the page of a built-in app, under its title. The shell's layers, from
 * the bottom: `home` is Home itself, `assistant` is Ask Alpha over Home and every app, `overlay` is whatever covers
 * them when its own machine says so (a call, the startup walkthrough, an approval, an update), and `notice` is on
 * top. `<area>/<name>` is a place an area's screen offers the others, drawn with `alpha.slot`, such as
 * `settings/account` or `home/cards`.
 */
export type Place = `view:${View}` | "home" | "assistant" | "overlay" | "notice" | `${string}/${string}`;

/** One screen at one place, loaded the first time it is drawn, so that Home ships no area's screen. */
export interface Mount {
  readonly at: Place;
  readonly load: () => Promise<{ default: Area }>;
  /** The screen itself, where it ships in the first chunk and is drawn with the first paint. */
  readonly first?: Area;
}

export const at = (place: Place, load: Mount["load"]): Mount => ({ at: place, load });

/** `screen` at `place` in the first chunk, drawn with the first paint: for Home alone, which is what a launcher shows first. */
export const first = (place: Place, screen: Area): Mount => ({ at: place, load: () => Promise.resolve({ default: screen }), first: screen });

/** Every screen of Alpha and where it is drawn: one line each, in the order a place draws them. Lines are only ever added. */
export const mounts: readonly Mount[] = [
  first("home", home),
  at("assistant", () => import("./ask/index.tsx")),
  at("notice", () => import("./shell/Notices.tsx")),
  at("assistant", () => import("./assistant/index.tsx")),
  at("view:Settings", () => import("./settings/index.tsx")),
  at("view:Inbox", () => import("./inbox/index.tsx")),
];
