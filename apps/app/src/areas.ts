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
  at("notice", () => import("./notices/Toasts.tsx")),
  at("assistant", () => import("./assistant/index.tsx")),
  at("view:Settings", () => import("./settings/index.tsx")),
  at("overlay", () => import("./account/index.tsx")),
  at("view:Inbox", () => import("./inbox/index.tsx")),
  at("view:Calendar", () => import("./calendar/index.tsx")),
  at("view:Camera", () => import("./camera/index.tsx")),
  at("view:Photos", () => import("./photos/index.tsx")),
  at("view:Files", () => import("./files/index.tsx")),
  at("view:Maps", () => import("./maps/index.tsx")),
  at("view:Phone", () => import("./phone/index.tsx")),
  at("view:Messages", () => import("./messages/index.tsx")),
  at("view:Contacts", () => import("./contacts/index.tsx")),
  at("view:Clock", () => import("./clock/index.tsx")),
  at("view:Reminders", () => import("./reminders/index.tsx")),
  at("view:Workflows", () => import("./workflows/index.tsx")),
  at("view:Notes", () => import("./notes/index.tsx")),
  at("overlay", () => import("./phone/strip.tsx")),
  at("overlay", () => import("./clock/alertOverlay.tsx")),
  at("overlay", () => import("./reminders/alertOverlay.tsx")),
  at("phone/stage", () => import("./phone/stage.tsx")),
  at("settings/phone", () => import("./phone/settingsDetails.tsx")),
  at("settings/activity", () => import("./assistant/settingsActivity.tsx")),
  at("overlay", () => import("./contacts/requestCard.tsx")),
  at("home/cards", () => import("./clock/cards.tsx")),
  at("settings/update", () => import("./update/index.tsx")),
  at("overlay", () => import("./update/overlay.tsx")),
  at("view:Browser", () => import("./browser/index.tsx")),
];
