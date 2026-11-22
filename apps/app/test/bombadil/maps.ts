// spec/maps/plane.md, "Google content is drawn only on the Google raster, and other content on the world or open raster"; spec/maps/vocabulary.md, "A Google place is never saved, shared, renamed or copied, and Google guidance is never spoken"; spec/maps/screen.md, "The provider's routes are listed in order and choosing one sends no new request"; spec/maps/screen.md, "Typing waits 350 milliseconds; Enter searches once for the text, and repeating it reuses the answer"
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
