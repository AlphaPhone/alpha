import { installDockClearance as installSharedDockClearance, visibleDocks as sharedVisibleDocks } from '../../../../.eliza/client-features/packages/ui/src/components/shell/dock-clearance.ts';
/**
 * How much of the bottom of the phone the composer or pill covers, including an expanded chat's
 * text/voice composer, measured in the phone canvas's own pixels and published on the root element.
 * `--alpha-dock-clearance` is everything the dock covers now; `--alpha-dock-rest` is the bar alone.
 * phone.css gives Home, the app library and every app scroller that much scroll padding so a focused
 * control is brought wholly above the dock, and top notices use it so they cannot cover a multiline
 * draft. Measurements use layout coordinates, so entrance animations and chat dragging do not resize
 * Home. While no dock is on screen (the shade or lock screen) the last footprint is kept, so Home does
 * not jump when the dock returns.
 */
const DOCK_CLEARANCE_PROPERTY = '--alpha-dock-clearance';
const DOCK_REST_PROPERTY = '--alpha-dock-rest';
const HEADER_CLEARANCE_PROPERTY = '--alpha-header-clearance';
// App headers, the Apps drawer's title row with its Close button, and an open
// in-phone modal sheet (a month picker, a menu): a notice goes below it, or, when the sheet
// leaves no room, just above the dock as before, never over the sheet's header.
const APP_HEADERS = '[data-alpha-app-header],[data-alpha-layer="drawer"] div:has(> h1),[role="dialog"][aria-modal="true"]:not([data-alpha-layer="drawer"]),.photo-import-menu[open] > div';
const DOCK = '[data-alpha-layer="composer"],[data-alpha-layer="pill"] > *,.alpha-chat-composer';

/** The dock elements on screen now: rendered, and not retired behind the shade or a voice session. */
export function visibleDocks(root: ParentNode = document): HTMLElement[] {
  return sharedVisibleDocks(root, DOCK);
}

let installed: (() => void) | null = null;
/**
 * Installed once per document; a second call returns the same uninstaller. The measuring and
 * publishing are shared with Eliza (packages/ui/src/components/shell/dock-clearance.ts); Alpha
 * supplies its screen, dock and bar selectors and its installed property names.
 */
export function installDockClearance(): () => void {
  if (installed) return installed;
  const uninstall = installSharedDockClearance({ screen: '[data-screen]', docks: DOCK, bar: '[data-alpha-input-bar]', clearanceProperty: DOCK_CLEARANCE_PROPERTY, restProperty: DOCK_REST_PROPERTY });
  const uninstallHeader = installHeaderClearance();
  const stop = () => {
    if (installed !== stop) return;
    installed = null;
    uninstallHeader();
    uninstall();
  };
  installed = stop;
  return stop;
}

/** Product headers stay tappable when transient notices appear at the top. */
function installHeaderClearance(): () => void {
  let frame = 0, published = '', watched: HTMLElement[] = [];
  const sizes = new ResizeObserver(() => schedule());
  const measure = () => {
    frame = 0;
    const screen = document.querySelector<HTMLElement>('[data-screen]');
    if (!screen || !screen.offsetWidth) return;
    const box = screen.getBoundingClientRect(), scale = box.width / screen.offsetWidth || 1;
    const conversation = screen.querySelector<HTMLElement>('[data-alpha-layer="conversation"]:not([inert])');
    const fullChat = conversation && screen.dataset.alphaChatHalf !== 'true';
    const headers = Array.from((fullChat ? conversation : screen).querySelectorAll<HTMLElement>(fullChat ? '[data-alpha-chat-header]' : APP_HEADERS))
      .filter(header => header.getClientRects().length > 0 && !header.closest('[inert]'));
    const measured = [screen, ...headers];
    if (measured.length !== watched.length || measured.some((header, index) => header !== watched[index])) {
      sizes.disconnect(); for (const header of measured) sizes.observe(header); watched = measured;
    }
    const next = `${Math.max(0, ...headers.map(header => Math.ceil((header.getBoundingClientRect().bottom - box.top) / scale)))}px`;
    if (next !== published) {
      published = next;
      document.documentElement.style.setProperty(HEADER_CLEARANCE_PROPERTY, next);
    }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
  const changes = new MutationObserver(schedule);
  changes.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['inert', 'data-alpha-chat-half', 'open'] });
  const root = new MutationObserver(schedule);
  root.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
  window.addEventListener('resize', schedule);
  document.addEventListener('animationend', schedule, true);
  document.addEventListener('transitionend', schedule, true);
  measure();
  return () => {
    changes.disconnect(); root.disconnect(); sizes.disconnect();
    if (frame) cancelAnimationFrame(frame);
    window.removeEventListener('resize', schedule);
    document.removeEventListener('animationend', schedule, true);
    document.removeEventListener('transitionend', schedule, true);
    document.documentElement.style.removeProperty(HEADER_CLEARANCE_PROPERTY);
  };
}
