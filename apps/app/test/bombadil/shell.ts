// spec/shell/navigation.md, "Back closes the topmost layer first, then Home's launcher layers, then the assistant, then the app"; spec/shell/navigation.md, "The library, its entry menu and Home's edit mode exist only over Home"; spec/shell/toasts.md, "A toast leaves when its time is up, its Undo ran or the owner dismissed it, and the next one takes its place"; spec/shell/toasts.md, "A persistent notice is listed until dismissed, at most three, each once"; spec/shell/permissions.md, "The first-run walkthrough says which step of how many it shows"; spec/shell/permissions.md, "An allowed step says how much Android allowed, and a browser request left off says so"; spec/shell/navigation.md, "A layer is listed once, closes with its owner or with Back, and holds the phone while open"; spec/shell/navigation.md, "The stand-in shade opens only over Home"; spec/shell/geometry.md, "The dock's footprint is published while a dock shows, and kept while none does"; spec/shell/overview.md, "A card shows only when it has something, and the date stands in when none does"; spec/shell/favorites.md, "Every key is current and listed once"; spec/shell/recovery.md, "Switch Home is offered only where Android reports a launcher build"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const backFlagCoversLayers = extract(({ document }) => {
  const open = document.querySelector('[data-alpha-layer="drawer"], [data-alpha-app]:not([hidden]), [role="dialog"][data-state="open"]') !== null;
  return !open || document.documentElement.dataset.alphaCanGoBack === "true";
});

const libraryOnlyOverHome = extract(({ document }) =>
  document.querySelector('[data-alpha-layer="drawer"]') === null || document.querySelector("[data-alpha-app]:not([hidden])") === null);

const undoHasItsToast = extract(({ document }) => {
  const toast = document.querySelector("[data-alpha-toast]");
  if (!toast) return true;
  const undo = Array.from(toast.querySelectorAll("button")).some((button) => button.textContent === "Undo");
  return !undo || (toast.textContent ?? "").replace("Undo", "").trim() !== "";
});

const oneShownApp = extract(({ document }) => document.querySelectorAll("[data-alpha-app]:not([hidden])").length <= 1);

/** Android is handed Back whenever the library, an app or a dialog is open, so leaving never abandons one. */
export const shellBackFlagCoversOpenLayers = always(() => backFlagCoversLayers.current);

/** The library is never drawn over an app. */
export const shellLibraryOnlyOverHome = always(() => libraryOnlyOverHome.current);

/** An Undo is offered only beside the sentence it undoes. */
export const shellUndoHasItsToast = always(() => undoHasItsToast.current);

/** At most one app is shown; every other kept app is hidden. */
export const shellOneAppInFront = always(() => oneShownApp.current);

const noticesListedOnce = extract(({ document }) => {
  const notices = Array.from(document.querySelectorAll("[data-alpha-persistent-notice]")).map((row) => (row.textContent ?? "").trim());
  return notices.length <= 3 && new Set(notices).size === notices.length;
});

const stepCountFits = extract(({ document }) => {
  const counts = Array.from(document.querySelectorAll('[role="dialog"] [role="status"]'))
    .map((row) => /^Step (\d+) of (\d+)$/.exec((row.textContent ?? "").trim()))
    .filter((match): match is RegExpExecArray => match !== null);
  return counts.every((match) => {
    const step = Number(match[1]), total = Number(match[2]);
    return (total === 4 || total === 7) && step >= 1 && step <= total;
  });
});

const homeInertUnderLayers = extract(({ document }) => {
  const dialog = document.querySelector('[role="dialog"][data-state="open"], [data-alpha-layer="drawer"]') !== null;
  const home = document.querySelector('[data-alpha-layer="home"]');
  return !dialog || home === null || home.hasAttribute("inert");
});

const shadeOnlyOverHome = extract(({ document }) => {
  const shade = document.querySelector("[data-alpha-stand-in-shade]");
  return shade === null || document.querySelector("[data-alpha-app]:not([hidden])") === null;
});

/** At most three persistent notices are listed, each once. */
export const shellNoticesListedOnce = always(() => noticesListedOnce.current);

/** The walkthrough's step count names a step inside its own list of four or seven. */
export const shellStepCountFitsTheList = always(() => stepCountFits.current);

/** Home takes no touch while a dialog, a sheet or the library lies over it. */
export const shellHomeInertUnderLayers = always(() => homeInertUnderLayers.current);

/** The stand-in shade is drawn only over Home. */
export const shellShadeOnlyOverHome = always(() => shadeOnlyOverHome.current);

const checkNoticeIsTheBrowsers = extract(({ document }) => {
  const lines = Array.from(document.querySelectorAll('[role="dialog"] [role="status"]')).map((row) => (row.textContent ?? "").trim());
  const noticed = lines.some((line) => line === "Still off" || line === "Couldn’t confirm");
  return !noticed || !lines.some((line) => /^Step \d+ of 7$/.test(line));
});

/** "Still off" and "Couldn’t confirm" are a browser's lines; Android's seven-step walkthrough never shows them. */
export const shellCheckNoticeIsTheBrowsers = always(() => checkNoticeIsTheBrowsers.current);

const dockLengthsAgree = extract(({ document }) => {
  const style = document.documentElement.style;
  const clearance = style.getPropertyValue("--alpha-dock-clearance").trim(), rest = style.getPropertyValue("--alpha-dock-rest").trim();
  if (clearance === "" && rest === "") return true;
  return /^\d+px$/.test(clearance) && /^\d+px$/.test(rest) && parseInt(rest, 10) > 0 && parseInt(rest, 10) <= parseInt(clearance, 10);
});

/** The dock's two published lengths come together, as whole pixels, the bar never more than everything the dock covers. */
export const shellDockLengthsAgree = always(() => dockLengthsAgree.current);

const overview = extract(({ document }) => {
  const today = document.querySelector('[role="list"][aria-label="Today"]');
  return { date: document.querySelector("[data-alpha-home-date]") !== null, list: today !== null, cards: today?.children.length ?? 0 };
});

/** Home shows its cards or, when none has something, the date: never both, and never an empty row of cards. */
export const shellHomeShowsCardsOrTheDate = always(() => !(overview.current.date && overview.current.list) && (!overview.current.list || overview.current.cards > 0));

const homeTilesOnce = extract(({ document }) => {
  const keys = Array.from(document.querySelectorAll('[role="list"][aria-label="Apps on Home"] [data-alpha-tile]')).map((tile) => tile.getAttribute("data-alpha-tile") ?? "");
  return new Set(keys).size === keys.length;
});

/** Every app on Home is listed once. */
export const shellHomeListsEachAppOnce = always(() => homeTilesOnce.current);

const editingOverHome = extract(({ document }) =>
  document.querySelector("[data-alpha-home-editing]") === null || document.querySelector("[data-alpha-app]:not([hidden])") === null);

/** Home's edit mode is never kept under an open app. */
export const shellEditModeOnlyOverHome = always(() => editingOverHome.current);

const switchHome = extract(({ document }) => {
  const offered = Array.from(document.querySelectorAll('[role="alertdialog"] button')).some((button) => button.textContent?.trim() === "Switch Home");
  const variant = document.documentElement.dataset.alphaVariant;
  return !offered || variant === "launcher" || variant === "aosp";
});

/** The recovery screen offers Switch Home only on a phone build, never on the browser page. */
export const shellSwitchHomeOnlyOnThePhone = always(() => switchHome.current);
