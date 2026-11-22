// spec/telephony/comms.md, "The bar addresses Alpha exactly while the chat is open, and the left slot holds the other target"; spec/telephony/comms.md, "End is beside the bar when closed, in the call card when open, in the strip when full, and on the voice panel during a voice turn"; spec/telephony/callBar.md, "An ended call's bar holds its place for a moment and takes no taps"; spec/telephony/drafts.md, "Only the owner's Send binds a draft to an operation, and Send again reuses the bound operation"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const telephonyScreen = 'section[aria-label="Phone"], section[aria-label="Messages"], section[aria-label="Contacts"]';

const oneComposer = extract(({ document }) => {
  const screen = document.querySelector(telephonyScreen);
  return !screen || screen.querySelectorAll("[data-alpha-composer]").length === 1;
});

/** Each Phone, Contacts and Messages screen has exactly one bottom input (AC-01). */
export const telephonyOneBarPerScreen = always(() => oneComposer.current);

const noSuggestions = extract(({ document }) => document.querySelector("[data-alpha-chat-suggestions]") === null);

/** Automatic suggestions are deferred: no suggestion chip row ever renders (AC-23, AC-24). */
export const telephonyNoSuggestionChips = always(() => noSuggestions.current);

const endReachable = extract(({ document }) => {
  const bar = document.querySelector('[role="status"] button[aria-label^="Return to call"]');
  if (!bar) return true;
  const end = document.querySelector<HTMLButtonElement>('button[aria-label="End call"], button[aria-label="Decline"]');
  if (!end) return false;
  const box = end.getBoundingClientRect();
  const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
  return hit !== null && (hit === end || end.contains(hit));
});

/** While a live call's bar shows, End (or Decline) is on screen and nothing covers it (AC-18). */
export const telephonyEndIsNeverCovered = always(() => endReachable.current);

const endedInert = extract(({ document }) => {
  const ended = document.querySelector<HTMLButtonElement>('[role="status"] button[aria-label="Call ended"]');
  return !ended || ended.disabled;
});

/** An ended call's bar offers nothing to press. */
export const telephonyEndedBarTakesNoTaps = always(() => endedInert.current);

const draftsNeedSend = extract(({ document }) => {
  const drafts = [...document.querySelectorAll('section[aria-label^="Alpha\'s draft, not sent"]')];
  return drafts.every((draft) => [...draft.querySelectorAll("button")].some((b) => b.textContent?.trim() === "Send"));
});

/** Alpha's draft always shows its own Send: it waits for the owner's tap and is never sent otherwise (AC-14). */
export const telephonyAlphaDraftWaitsForSend = always(() => draftsNeedSend.current);
