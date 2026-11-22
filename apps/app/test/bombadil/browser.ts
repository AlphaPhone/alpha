// spec/browser/session.md, "Opening the menu, the switcher or the library ends address editing, and the menu never covers editing"; spec/browser/session.md, "A started Browser always has a tab, selects one of them, and never holds more than eight"; spec/browser/session.md, "Next and previous step through matches only when there are matches, and closing clears the native search"; spec/browser/reviews.md, "Reviews are open dialogs, one per identity, each of a kind"
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
