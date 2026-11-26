import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

export * from "@antithesishq/bombadil/browser/defaults";

const answers: Record<string, string> = { Calendar: "Two things this afternoon.", Text: "Here’s the text. Send it?", Maps: "Three within a five-minute walk.", Inbox: "Three need you." };

const phone = extract(({ document, window }) => {
  if (!["localhost", "127.0.0.1", "alphaphone.dev"].includes(window.location.hostname) || window.location.pathname !== "/") return null;
  const shown = document.querySelector('[role="img"][aria-label^="An Alpha phone"]');
  const text = shown?.textContent ?? "";
  return {
    mounted: shown !== null,
    scene: shown?.getAttribute("data-scene") ?? "Home",
    sheet: shown?.querySelector("[data-sheet]")?.getAttribute("data-sheet") ?? "closed",
    typing: shown?.querySelector("[data-typing]") != null,
    text,
    offered: text.includes("Cancel"),
    sent: text.includes("I’ll tell you when she replies."),
  };
});

// spec/site/index.md, "The phone is always on a beat of its scene"
/** One scene is on the phone at a time: the conversation is open for exactly the four that are asked in it. */
export const siteOneSceneAtATime = always(() => {
  const current = phone.current;
  return current === null || (current.mounted && (current.sheet === "open") === (current.scene in answers));
});

// spec/site/index.md, "The conversation is open for the four questions and keeps what was said, a part showing from its beat on and what passes only during its beats"
/** The agent is never shown typing beside its answer to the question it is thinking about. */
export const siteTypingBeforeTheAnswer = always(() => {
  const current = phone.current;
  const answer = current === null ? undefined : answers[current.scene];
  return current === null || !current.typing || (answer !== undefined && !current.text.includes(answer));
});

// spec/site/index.md, "The phone plays Home, the calendar, a text, a map, the inbox and a spoken note, each staged in beats"
/** The text is never said to be sent while Alpha is still asking whether to send it. */
export const siteAsksBeforeItSends = always(() => phone.current === null || !(phone.current.offered && phone.current.sent));
