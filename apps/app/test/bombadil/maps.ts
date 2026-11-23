// spec/maps/plane.md, "Google content is drawn only on the Google raster, and other content on the world or open raster"; spec/maps/guidance.md, "Story: Reroute the guidance I started only when my agent asks, from a fresh fix"; spec/maps/eventReturn.md, "Story: Go back to the event whose place I opened"; spec/maps/screen.md, "Story: Find a place"; spec/maps/vocabulary.md, "A Google place is never saved, shared, renamed or copied, and Google guidance is never spoken"; spec/maps/screen.md, "The provider's routes are listed in order and choosing one sends no new request"; spec/maps/screen.md, "Typing waits 350 milliseconds; Enter searches once for the text, and repeating it reuses the answer"; spec/maps/screen.md, "Swapping ends keeps each end's identity and plans the reverse route"
// What must hold on the Maps screen in every state Bombadil reaches.
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const googleBadgeAlone = extract(({ document }) => {
  const badge = document.querySelector('[aria-label="Google Maps credits"]');
  return !badge || document.querySelector('[aria-label="Map information"]:not(section)') === null;
});

/** On a Google map the Google Maps badge is the only credit: no information button beside it. */
export const mapsGoogleMapShowsOnlyTheBadge = always(() => googleBadgeAlone.current);

const googlePlaceKept = extract(({ document }) => {
  const sheet = document.querySelector('main[aria-label="Maps"] section[aria-label]');
  const badge = document.querySelector('[aria-label="Google Maps credits"]');
  if (!sheet || !badge) return true;
  return sheet.querySelector('button[aria-label="Share"], button[aria-label="Copy number"], button[aria-label="Rename"]') === null
    || sheet.querySelector('button[aria-label="Directions"]') === null;
});

/** A Google place offers no Share, Copy number or Rename. */
export const mapsGooglePlaceIsNeverShared = always(() => googlePlaceKept.current);

const startNeedsRoute = extract(({ document }) => {
  const start = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((b) => b.textContent?.trim() === "Start");
  if (!start || start.disabled) return true;
  return document.querySelector('ol[aria-label="Steps"]') !== null;
});

/** Start is offered only with a planned route on screen. */
export const mapsStartNeedsARoute = always(() => startNeedsRoute.current);

const searchBounded = extract(({ document }) => {
  const input = document.querySelector<HTMLInputElement>('input[aria-label="Search places"]');
  return !input || input.value.length <= 300;
});

/** A search never holds more than 300 characters. */
export const mapsSearchIsAtMost300Characters = always(() => searchBounded.current);

const controlsBeforeMap = extract(({ document }) => {
  const root = document.querySelector('main[aria-label="Maps"]');
  const map = root?.querySelector('[role="application"], [aria-label="Google map unavailable"]');
  const controls = root?.querySelector('form[role="search"], section[aria-label="Guidance"], section[aria-label^="Directions to"]');
  if (!map || !controls) return true;
  return (controls.compareDocumentPosition(map) & 4) !== 0;
});

/** The search, directions and guidance controls come before the map plane in reading order. */
export const mapsControlsPrecedeTheMap = always(() => controlsBeforeMap.current);

const noReroute = extract(({ document }) => {
  const root = document.querySelector('main[aria-label="Maps"]');
  if (!root) return true;
  return !Array.from(root.querySelectorAll("button")).some((b) => /^reroute/i.test((b.getAttribute("aria-label") ?? b.textContent ?? "").trim()));
});

/** The screen offers no Reroute control: a new route comes only from the agent's explicit request. */
export const mapsHasNoRerouteControl = always(() => noReroute.current);

const googleSilent = extract(({ document }) => {
  const root = document.querySelector('main[aria-label="Maps"]');
  const google = root?.querySelector('[aria-label="Google Maps credits"], [aria-label="Google map unavailable"]');
  if (!google || !root?.querySelector('section[aria-label="Guidance"]')) return true;
  return root.querySelector('button[aria-label="Guidance voice"]') === null;
});

/** Guidance on Google content offers no voice. */
export const mapsGoogleGuidanceIsNeverVoiced = always(() => googleSilent.current);

const noReturnWhileGuiding = extract(({ document }) => {
  const root = document.querySelector('main[aria-label="Maps"]');
  if (!root?.querySelector('section[aria-label="Guidance"]')) return true;
  return !Array.from(root.querySelectorAll("button")).some((b) => b.textContent?.trim() === "Back to event");
});

/** Back to event is never offered while guiding. */
export const mapsNoReturnToEventWhileGuiding = always(() => noReturnWhileGuiding.current);

const swapNeedsRoute = extract(({ document }) => {
  const swap = document.querySelector('button[aria-label="Swap start and destination"]');
  if (!swap || swap.getAttribute("aria-disabled") === "true") return true;
  return document.querySelector('ol[aria-label="Steps"]') !== null;
});

/** Swap can run only with a planned route on screen; otherwise it stays on the sheet and says it is unavailable. */
export const mapsSwapNeedsAPlannedRoute = always(() => swapNeedsRoute.current);
