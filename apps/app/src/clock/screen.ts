// spec/clock/reminderTaps.md, "The token is consumed only after the exact detail is on screen"; spec/clock/canonicalTaps.md, "The tap is acknowledged once, only after its view is on screen in the same session"
import type { Nav } from "../../gen/shell__navigation.ts";

/**
 * The app the shell shows ("home" when none) and the route it shows it at, if any.
 * @throws {never}
 */
export function shownOf(nav: Nav): { app: string; route?: string } {
  const app = nav.app === "" ? "home" : nav.app;
  const route = nav.places.find((place) => place.app === nav.app)?.route;
  return route ? { app, route } : { app };
}
