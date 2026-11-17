import { Select } from "./Select.tsx";
import { meta } from "./Select.meta.tsx";

export default { title: "Ui/Select", component: Select };

/**
 * The open list. Radix hides the page behind it with `aria-hidden` and traps focus in it, so the trigger, still in the
 * tab order on the hidden page, cannot be reached. axe cannot see the trap: it excuses a focusable hidden element only
 * while a dialog or a full-page overlay is open, which is why Dialog and Sheet pass and a menu or a list does not. So
 * `aria-hidden-focus` skips what Radix hid, which it marks `data-aria-hidden`, and still checks every `aria-hidden` a
 * component sets itself.
 */
export const Open = {
  args: { ...meta.args, defaultOpen: true, defaultValue: "inbox" },
  parameters: { a11y: { config: { rules: [{ id: "aria-hidden-focus", selector: '[aria-hidden="true"]:not([data-aria-hidden])' }] } } },
};
