import { fn } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { ContactsScreenProps } from "./ContactsScreen.tsx";

export const meta: ComponentMeta<ContactsScreenProps> = {
  args: { onClose: fn() },
  examples: {
    FromPhone: { route: "from:phone" },
    AlphaFilter: { route: "filter:Maya" },
    LongFilter: { route: `filter:${"Maya Chen climbing partner ".repeat(4).trim()}` },
  },
};
