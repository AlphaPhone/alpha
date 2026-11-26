import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

export * from "@antithesishq/bombadil/browser/defaults";

const answers: Record<string, string> = { Day: "Two things this afternoon.", Coffee: "Three within a five-minute walk.", Mail: "Send it?" };

const phone = extract(({ document, window }) => {
  if (!["localhost", "127.0.0.1", "alphaphone.dev"].includes(window.location.hostname) || window.location.pathname !== "/") return null;
  const shown = document.querySelector('[role="img"][aria-label^="An Alpha phone"]');
  const text = shown?.textContent ?? "";
  return {
    mounted: shown !== null,
    scene: shown?.getAttribute("data-scene") ?? "Home",
    sheet: shown?.querySelector("[data-sheet]")?.getAttribute("data-sheet") ?? "closed",
    typing: shown?.querySelector("[data-sheet] [data-typing]") != null && shown.querySelector("[data-sheet]")?.getAttribute("data-sheet") === "open",
    text,
    offered: text.includes("Cancel"),
    sent: shown?.querySelector("[data-sent]") != null,
  };
});

// spec/site/index.md, "The conversation is open for the day, the coffee and the mail, and keeps what was said while it is open and as it closes"
/** One scene is on the phone at a time: the conversation is open for exactly the three that are asked in it. */
export const siteOneSceneAtATime = always(() => {
  const current = phone.current;
  return current === null || (current.mounted && (current.sheet === "open") === (current.scene in answers));
});

// spec/site/index.md, "A part of a scene shows from its beat on, a part of a kept scene whole, and what passes only during its beats"
/** In the conversation the agent is never shown at work beside the answer that work leads to. */
export const siteTypingBeforeTheAnswer = always(() => {
  const current = phone.current;
  const answer = current === null ? undefined : answers[current.scene];
  return current === null || !current.typing || (answer !== undefined && !current.text.includes(answer));
});

// spec/site/index.md, "The phone plays nine scenes, each staged in beats"
/** The reply is never said to be sent while Alpha is still asking whether to send it. */
export const siteAsksBeforeItSends = always(() => phone.current === null || !(phone.current.offered && phone.current.sent));
