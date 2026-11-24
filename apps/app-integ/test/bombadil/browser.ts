// spec/browser/session.md, "Opening the menu, the switcher or the library ends address editing, and the menu never covers editing"; spec/browser/session.md, "A new tab, normal or private, opens selected with its address field, unless eight are open"; spec/browser/egress.md, "What the shell reads at each tap is the selected tab's page and whether the Browser view shows it"; spec/browser/reading.md, "The question goes to the editor only with an excerpt or clean pasted text, and only while the same page is shown"; spec/browser/session.md, "A started Browser always has a tab, selects one of them, and never holds more than eight"; spec/browser/session.md, "Next and previous step through matches only when there are matches, and closing clears the native search"; spec/browser/reviews.md, "Reviews are open dialogs, one per identity, each of a kind"; spec/browser/pageContext.md, "A page is read only for a message observed on the page Browser shows now, a settled public HTTPS page of a normal tab, with Browser page for Alpha on and a peer that takes it"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const menuOverEditing = extract(({ document }) => {
  const editing = document.querySelector('[role="search"][aria-label="Address"]') !== null;
  const menu = document.querySelector('[role="menu"][aria-label="Browser menu"]') !== null;
  return editing && menu;
});

/** The menu never opens over the address editor. */
export const browserMenuNeverCoversEditing = always(() => !menuOverEditing.current);

const tabCards = extract(({ document }) => document.querySelectorAll('button[aria-label^="Switch to"]').length);
const selectedCards = extract(({ document }) => document.querySelectorAll('button[aria-label^="Switch to"][aria-current="true"]').length);

/** An open switcher shows one to eight tabs, exactly one of them selected. */
export const browserSwitcherSelectsOneOfAtMostEightTabs = always(() => tabCards.current === 0 || (tabCards.current <= 8 && selectedCards.current === 1));

const stepWithoutMatches = extract(({ document }) => {
  const status = document.querySelector('[role="search"][aria-label="Find in page"] [role="status"]')?.textContent ?? "";
  const next = document.querySelector<HTMLButtonElement>('button[aria-label="Next match"]');
  return next !== null && !next.disabled && !/\d+ of \d+/.test(status);
});

/** Next match is offered only while the bar shows matches. */
export const browserFindStepsOnlyThroughMatches = always(() => !stepWithoutMatches.current);

const reviewDialogs = extract(({ document }) => document.querySelectorAll('[role="dialog"] button').length > 0 ? document.querySelectorAll('[role="dialog"]').length : 0);

/** At most one Browser confirmation is shown at a time. */
export const browserShowsOneReviewAtATime = always(() => reviewDialogs.current <= 1);

const privateEditorUnmarked = extract(({ document }) => {
  const editor = document.querySelector<HTMLInputElement>('[role="search"][aria-label="Address"] input');
  const privateTab = [...document.querySelectorAll('nav[aria-label="Browser"] span')].some((span) => span.textContent === "Private");
  return editor !== null && privateTab && editor.getAttribute("aria-label") !== "Search or address, private";
});

/** An address editor over a private tab always says the tab is private. */
export const browserPrivateTabStaysMarkedWhileEditing = always(() => !privateEditorUnmarked.current);

const newTabAtTheLimit = extract(({ document }) => {
  const cards = document.querySelectorAll('button[aria-label^="Switch to"]').length;
  const offered = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
    .some((button) => (button.textContent === "New tab" || button.textContent === "Private") && !button.disabled);
  return cards >= 8 && offered;
});

/** With eight tabs open the switcher offers no new tab. */
export const browserNoNewTabAtTheLimit = always(() => !newTabAtTheLimit.current);

const egressWithoutAPage = extract(({ document }) => {
  const viewport = document.querySelector("[data-browser-surfaces]");
  const blank = viewport !== null && [...viewport.querySelectorAll("p")].some((p) => p.textContent === "New tab" || p.textContent === "Private · cleared on close");
  const loading = viewport?.getAttribute("aria-label") === "Loading website";
  const offered = [...document.querySelectorAll<HTMLButtonElement>('[role="menu"][aria-label="Browser menu"] [role="menuitem"]')]
    .some((item) => ["Share", "Bookmark", "Bookmarked", "Open in another browser"].includes(item.textContent ?? "") && !item.disabled);
  return (blank || loading) && offered;
});

/** Share, Bookmark and Open in another browser are offered only for a loaded page. */
export const browserNoEgressWithoutALoadedPage = always(() => !egressWithoutAPage.current);

const questionWithoutText = extract(({ document }) => {
  const dialog = [...document.querySelectorAll('[role="dialog"]')].find((d) => d.querySelector("h2")?.textContent === "Ask about page");
  if (dialog === undefined) return false;
  const text = dialog.querySelector<HTMLTextAreaElement>('textarea[aria-label="Excerpt"]')?.value ?? "";
  const go = [...dialog.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent === "Continue");
  return text.trim() === "" && go !== undefined && !go.disabled;
});

/** Ask about page never continues without an excerpt or pasted text. */
export const browserQuestionNeedsText = always(() => !questionWithoutText.current);

const privatePageShareable = extract(({ document }) => {
  const shareable = document.querySelector('section[aria-label="Browser"][data-page-shareable="true"]') !== null;
  const privateTab = [...document.querySelectorAll('nav[aria-label="Browser"] span')].some((span) => span.textContent === "Private");
  return shareable && privateTab;
});

/** A private tab's page is never offered to a message. */
export const browserPrivatePageIsNeverShared = always(() => !privatePageShareable.current);

const unloadedPageShareable = extract(({ document }) => {
  const shareable = document.querySelector('section[aria-label="Browser"][data-page-shareable="true"]') !== null;
  const viewport = document.querySelector("[data-browser-surfaces]");
  const blank = viewport !== null && [...viewport.querySelectorAll("p")].some((p) => p.textContent === "New tab" || p.textContent === "Private · cleared on close");
  const loading = viewport?.getAttribute("aria-label") === "Loading website";
  return shareable && (blank || loading);
});

/** A blank or loading tab is never offered to a message. */
export const browserUnloadedPageIsNeverShared = always(() => !unloadedPageShareable.current);
