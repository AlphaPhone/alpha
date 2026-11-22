// spec/assistant/emailCard.md, "Send is offered for a draft with an account, valid recipients and a body, and dispatches once per version"; spec/assistant/approvals.md, "A card whose review time passed reads \"Review expired\" and can only be asked for again"; spec/assistant/dock.md, "Home keeps its bar, and a dragged height lasts only while the chat it was dragged in is open"; spec/assistant/send.md, "The typing indicator belongs to the newest send, and an older send settling never clears it"; spec/assistant/reply.md, "A recognized tool block outside a fence becomes its card; inside a fence it stays code"; spec/assistant/approvals.md, "Decline runs nothing and works during an emergency call; Approve waits until the call ends"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const dock = extract(({ document }) => ({
  home: document.querySelector("[data-active-view]")?.getAttribute("data-active-view") === "home",
  bar: document.querySelector('[aria-label="Open conversation"]') !== null,
  pill: document.querySelector('button[aria-label="Type"]') !== null,
  sheet: document.querySelector('section[aria-label="Assistant"]') !== null,
}));

const composer = extract(({ document }) => ({
  stop: document.querySelector('button[aria-label="Stop reply"]') !== null,
  send: document.querySelector('button[aria-label="Send"]') !== null,
  talk: document.querySelector('button[aria-label="Talk"]') !== null,
}));

const fencedChoices = extract(({ document }) =>
  Array.from(document.querySelectorAll("pre code")).every((code) => code.querySelector("button") === null));

const cards = extract(({ document }) =>
  Array.from(document.querySelectorAll('[aria-label^="Approve "], [aria-label="Not during an emergency call."]')).every((approve) =>
    approve.parentElement?.querySelector('[aria-label^="Decline "]') !== null));

/** Home always shows the assistant: its bar or the open sheet, never only the pill. */
export const assistantHomeKeepsItsBar = always(() => !dock.current.home || dock.current.bar || dock.current.sheet);

/** Stop, Send and Talk are never offered together: Stop replaces both while a reply is written. */
export const assistantOneComposerAction = always(() => [composer.current.stop, composer.current.send, composer.current.talk].filter(Boolean).length <= 1);

/** Code blocks of a reply never hold a control: a tool block inside a fence stays text. */
export const assistantFencedBlocksStayText = always(() => fencedChoices.current);

/** Every card that offers Approve also offers Decline beside it. */
export const assistantDeclineAlwaysOffered = always(() => cards.current);

const emailCards = extract(({ document }) =>
  Array.from(document.querySelectorAll('[aria-label="Email draft"]')).map((card) => ({
    status: card.querySelector('[role="status"]')?.textContent ?? "",
    send: card.querySelector<HTMLButtonElement>("button:not([disabled])")?.textContent?.includes("Send") === true,
    to: card.querySelector<HTMLInputElement>("#assistant-email-to")?.value ?? "",
    body: card.querySelector<HTMLTextAreaElement>('textarea[aria-label="Body"]')?.value ?? "",
  })));

const expiredCards = extract(({ document }) =>
  Array.from(document.querySelectorAll("h3")).filter((title) => title.textContent === "Review expired")
    .every((title) => title.parentElement?.querySelector('[aria-label^="Approve "]') === null));

/** An email card is never sent on its own: a card that went out offers no Send, and Send is never offered without a recipient and a body. */
export const assistantEmailNeverSendsWithoutATap = always(() => emailCards.current.every((card) =>
  (card.status === "" || !card.send) && (!card.send || (card.to.trim() !== "" && card.body.trim() !== ""))));

/** A card whose review expired offers no Approve. */
export const assistantExpiredCardOffersNoApprove = always(() => expiredCards.current);
