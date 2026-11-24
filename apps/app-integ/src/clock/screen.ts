// spec/clock/reminderTaps.md, "The token is consumed only after the exact detail is on screen"; spec/clock/canonicalTaps.md, "The tap is acknowledged once, only after its view is on screen in the same session"; spec/clock/handoff.md, "Preparing shows the exact request with the phone's time zone; leaving, Back or hiding retires it"
import type { Nav } from "../../gen/shell__navigation.ts";

/** What Clock reads of the shell's navigation: the app in front and its route, whether the page hides, and whether the connection chooser or another layer covers the screen. */
export interface ClockView {
  readonly app: string;
  readonly route?: string;
  readonly hidden: boolean;
  readonly chooser: boolean;
  readonly covered: boolean;
}

/**
 * The app the shell shows ("home" when none) and the route it shows it at, if any.
 * @throws {never}
 */
export function shownOf(nav: Nav): { app: string; route?: string } {
  const app = nav.app === "" ? "home" : nav.app;
  const route = nav.places.find((place) => place.app === nav.app)?.route;
  return route ? { app, route } : { app };
}

/**
 * The navigation as Clock follows it; the connection chooser is the account area's layer.
 * @throws {never}
 */
export function viewOf(nav: Nav): ClockView {
  const layers = nav.layers ?? [];
  return { ...shownOf(nav), hidden: nav.hidden === true, chooser: layers.some((layer) => layer.id.startsWith("account")), covered: layers.length > 0 };
}
