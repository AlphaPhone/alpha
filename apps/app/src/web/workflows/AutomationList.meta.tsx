import type { ComponentMeta } from "vibestack/stories";
import type { AutomationListProps } from "./AutomationList.tsx";
import { heldUnknown, listed } from "./fixtures.ts";

export const meta: ComponentMeta<AutomationListProps> = {
  args: { list: listed, canAllowAnother: false, onOpen: () => undefined, onAllowAnother: () => undefined },
  examples: { HeldUnknown: { list: heldUnknown, canAllowAnother: true }, Waiting: { list: listed, waiting: ["t1"] } },
};
