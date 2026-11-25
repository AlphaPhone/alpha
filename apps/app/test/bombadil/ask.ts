// spec/app/ask/index.md, "The owner says something only in a conversation, one turn at a time, and it is sent once"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const offered = extract(({ document }) => {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>("section[aria-label='Ask Alpha'] button")];
  const labelOf = (button: HTMLButtonElement) => (button.getAttribute("aria-label") ?? button.textContent ?? "").trim();
  return {
    send: buttons.some((button) => !button.disabled && labelOf(button) === "Send"),
    stop: buttons.some((button) => !button.disabled && (labelOf(button) === "Stop reply" || labelOf(button) === "Stop")),
  };
});

/** While a reply can be stopped, nothing more can be sent. */
export const askOneTurnAtATime = always(() => !(offered.current.send && offered.current.stop));
