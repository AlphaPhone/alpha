// spec/app/sample/index.md, "A dismissed reminder leaves the list at once and is held for five seconds, one at a time and never while another is being deleted"
import { always } from "@antithesishq/bombadil";
import { extract } from "@antithesishq/bombadil/browser";

const offered = extract(({ document }) => {
  const labels = [...document.querySelectorAll("section[aria-label=Reminders] button")].map((button) => button.getAttribute("aria-label") ?? button.textContent ?? "");
  return { undo: labels.some((label) => label.startsWith("Undo ")), dismiss: labels.some((label) => label.startsWith("Dismiss ")) };
});

/** While a dismissal is held, Undo is offered and no other reminder can be dismissed. */
export const sampleOneDismissalAtATime = always(() => !(offered.current.undo && offered.current.dismiss));
