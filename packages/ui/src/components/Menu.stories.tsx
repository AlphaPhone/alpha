import { Menu } from "./Menu.tsx";
import { meta } from "./Menu.meta.tsx";

export default { title: "Ui/Menu", component: Menu };

/** The open menu. Radix hides the page behind it and keeps focus inside; axe sees the trigger on the hidden page and not the trap, so that one rule is off here. */
export const Open = {
  args: { ...meta.args, defaultOpen: true },
  parameters: { a11y: { config: { rules: [{ id: "aria-hidden-focus", enabled: false }] } } },
};
