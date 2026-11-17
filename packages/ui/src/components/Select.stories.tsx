import { Select } from "./Select.tsx";
import { meta } from "./Select.meta.tsx";

export default { title: "Ui/Select", component: Select };

/** The open list. Radix hides the page behind it and keeps focus inside; axe sees the trigger on the hidden page and not the trap, so that one rule is off here. */
export const Open = {
  args: { ...meta.args, defaultOpen: true, defaultValue: "inbox" },
  parameters: { a11y: { config: { rules: [{ id: "aria-hidden-focus", enabled: false }] } } },
};
