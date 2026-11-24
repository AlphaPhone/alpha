// spec/telephony/comms.md, "The bar addresses Alpha exactly while the chat is open, and the left slot holds the other target"; spec/telephony/voicemail.md, "Playing marks a voicemail heard, and nothing plays during a call or behind the lock"; spec/telephony/messages.md, "Delete passes the exact listed row after confirmation, and an unconfirmed delete keeps the row and blocks another"; spec/telephony/phone.md, "Dial hands one number at a time to Telecom, and only from the showing it started in"; spec/telephony/callBar.md, "The bar is about the call that needs me first: a ringing call, then the connected one"; spec/telephony/voicemail.md, "A delete needs the owner's confirmation of the open voicemail, and a refused delete keeps it"; spec/telephony/contacts.md, "A write holds the gate while it runs, and a lost answer blocks every write until an explicit read that began after it"; spec/telephony/comms.md, "End is beside the bar when closed, in the call card when open, in the strip when full, and on the voice panel during a voice turn"; spec/telephony/callBar.md, "An ended call's bar holds its place for a moment and takes no taps"; spec/telephony/drafts.md, "Only the owner's Send binds a draft to an operation, and Send again reuses the bound operation"; spec/telephony/comms.md, "A proposal restored from the phone's own store is shown, never approved, until Alpha proposes it again"; spec/telephony/phoneInfo.md, "Without phone-state access the SIM list reads as unread, never as no SIM"; spec/telephony/callBar.md, "The bar says Calling until the call is active, and only an active call counts a clock from its connect time"; spec/telephony/callBar.md, "While a call rings, Android's incoming alert is the only call bar"
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

const liveCall = (document: Document) => document.querySelector('[role="status"] button[aria-label^="Return to call"]') !== null;

const noPlayDuringCall = extract(({ document }) => {
  if (!liveCall(document)) return true;
  const play = document.querySelector<HTMLButtonElement>('section[aria-label="Phone"] button[aria-label="Play"]');
  return !play || play.disabled;
});

/** While a call is live, no voicemail can be started (the call pauses playback, and Play waits for the call to end). */
export const telephonyNoVoicemailPlaysDuringACall = always(() => noPlayDuringCall.current);

const keypadBounded = extract(({ document }) => {
  const field = document.querySelector('section[aria-label="Phone"] output[aria-label="Number"]');
  const digits = (field?.textContent ?? "").replace(/[^0-9*#+]/g, "");
  return digits.length <= 40 && digits.indexOf("+") <= 0 && digits.lastIndexOf("+") <= 0;
});

/** The keypad holds at most 40 characters, with a + only in front. */
export const telephonyKeypadNumberIsBounded = always(() => keypadBounded.current);

const safeLinks = extract(({ document }) => [...document.querySelectorAll<HTMLAnchorElement>("[data-alpha-messages-thread] a")]
  .every((a) => /^https?:\/\//i.test(a.getAttribute("href") ?? "") && !/^[a-z]+:\/\/[^/]*@/i.test(a.getAttribute("href") ?? "")));

/** A link in a conversation is only a credential-free http(s) address, opened by the owner's tap. */
export const telephonyMessageLinksAreSafe = always(() => safeLinks.current);

const oneCallBar = extract(({ document }) => document.querySelectorAll('[role="status"] button[aria-label^="Return to call"]').length <= 1);

/** The bar shows one call, the one that needs the owner first. */
export const telephonyOneCallBar = always(() => oneCallBar.current);

const confirmedDeletes = extract(({ document }) => {
  const messages = [...document.querySelectorAll('[role="alertdialog"][aria-label="Delete this message?"]')].length <= 1;
  const voicemail = document.querySelectorAll('[role="alertdialog"][aria-label="Delete this voicemail?"]').length <= 1;
  return messages && voicemail;
});

/** At most one delete confirmation is open at a time, so a confirmed delete names exactly one record. */
export const telephonyOneDeleteConfirmationAtATime = always(() => confirmedDeletes.current);

const editingHeldWhileUnknown = extract(({ document }) => {
  const contacts = document.querySelector('section[aria-label="Contacts"]');
  if (!contacts || !/Outcome unknown/.test(contacts.textContent ?? "")) return true;
  const add = contacts.querySelector<HTMLButtonElement>('button[aria-label="Add a contact"]');
  const edit = [...contacts.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === "Edit");
  return (!add || add.disabled) && (!edit || edit.disabled);
});

/** After a contact write the phone could not confirm, no new contact or edit can start until an explicit read. */
export const telephonyUnknownWriteHoldsContactWrites = always(() => editingHeldWhileUnknown.current);

const restoredInert = extract(({ document }) => {
  const cards = [...document.querySelectorAll('[role="status"][aria-label^="Saved suggestion"]')];
  return cards.every((card) => [...card.querySelectorAll("button")].every((b) => b.textContent?.trim() === "Dismiss"));
});

/** A proposal restored from the phone's store offers only Dismiss: nothing on it calls, texts or approves. */
export const telephonyRestoredProposalNeverActs = always(() => restoredInert.current);

const unreadIsNotNoSim = extract(({ document }) => {
  const page = document.querySelector('section[aria-label="Phone details"]');
  if (!page) return true;
  const asksAccess = [...page.querySelectorAll("button")].some((b) => b.textContent?.trim() === "Allow");
  const saysNone = [...page.querySelectorAll("span")].some((s) => s.textContent?.trim() === "SIM" && s.nextElementSibling?.textContent?.trim() === "None");
  return !(asksAccess && saysNone);
});

/** Settings → Phone never says there is no SIM while it is asking for the access that would list one. */
export const telephonyUnreadSimsAreNeverNoSim = always(() => unreadIsNotNoSim.current);

const LIVE_BAR_WORDS = /^(Calling…|On hold|On call|On call · \d+(:\d\d){1,2})$/;

const liveBars = extract(({ document }) =>
  Array.from(document.querySelectorAll('[role="status"]')).flatMap((bar) => {
    const label = bar.querySelector(':scope > button[aria-label^="Return to call, "]')?.getAttribute("aria-label");
    if (label === null || label === undefined) return [];
    return [{ words: label.slice("Return to call, ".length), decline: bar.querySelector('button[aria-label="Decline"]') !== null }];
  }));

/** Only an active call shows a clock, and the bar never presents a ring: Android's incoming alert offers Answer and Decline. */
export const telephonyClockOnlyOnAnActiveCall = always(() => liveBars.current.every(({ words, decline }) => LIVE_BAR_WORDS.test(words) && !decline));
