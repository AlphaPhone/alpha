import { fn } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { MessagesScreenProps } from "./MessagesScreen.tsx";

export const meta: ComponentMeta<MessagesScreenProps> = {
  args: { onClose: fn() },
  examples: {
    Compose: { route: "compose:(415) 555-0100" },
    Thread: { route: "thread:thread:1" },
    Notice: { route: "notice" },
    MalformedRoute: { route: "compose:Maya" },
  },
};
