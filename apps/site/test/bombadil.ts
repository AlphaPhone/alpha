import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

export * from "@antithesishq/bombadil/browser/defaults";

const phone = extract(({ document }) => {
  const shown = document.querySelector('[role="img"][aria-label^="An Alpha phone"]');
  const text = shown?.textContent ?? "";
  return {
    scene: shown?.getAttribute("data-scene") ?? "Home",
    sheet: shown?.querySelector("[data-sheet]")?.getAttribute("data-sheet") ?? "closed",
    marked: [...document.querySelectorAll('nav[aria-label="Walkthrough"] a[aria-current="true"]')].length,
    typing: shown?.querySelector("[data-typing]") != null,
    answered: ["Two things this afternoon.", "Three within a five-minute walk.", "Three need you.", "Sent"].some((answer) => text.includes(answer)),
    offered: text.includes("Cancel"),
    sent: text.includes("I’ll tell you when she replies."),
  };
});

// spec/site/index.md, "The phone is always on a beat of its scene, and a scene shown whole is on its first"
/** One scene is on the phone at a time: the conversation is open for exactly the four that are asked in it, and the walkthrough marks one. */
export const siteOneSceneAtATime = always(() => (phone.current.sheet === "open") === ["Calendar", "Text", "Maps", "Inbox"].includes(phone.current.scene) && phone.current.marked === 1);

// spec/site/index.md, "A part of a scene shows from its beat on, the typing only during its own, and all but the typing when shown whole"
/** The agent is never shown typing beside its answer. */
export const siteTypingBeforeTheAnswer = always(() => !(phone.current.typing && phone.current.answered));

// spec/site/index.md, "The phone shows Home, the calendar, a text, a map, the inbox and a spoken note, each staged in beats"
/** The text is never said to be sent while Alpha is still asking whether to send it. */
export const siteAsksBeforeItSends = always(() => !(phone.current.offered && phone.current.sent));
