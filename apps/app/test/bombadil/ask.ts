// spec/app/ask/index.md, "The owner says something only in a conversation, one turn at a time, and it is sent once"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const offered = extract(({ document }) => {
  const labels = [...document.querySelectorAll("section[aria-label='Ask Alpha'] button")].map((button) => button.textContent ?? "");
  return { send: labels.includes("Send"), stop: labels.includes("Stop") };
});

/** While a reply can be stopped, nothing more can be sent. */
export const askOneTurnAtATime = always(() => !(offered.current.send && offered.current.stop));
