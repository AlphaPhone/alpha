import type { ComponentMeta } from "vibestack/stories";
import type { AppHeaderProps } from "./AppHeader.tsx";
import { Button } from "./Button.tsx";

export const meta: ComponentMeta<AppHeaderProps> = {
  args: { title: "Notes" },
  examples: {
    Leading: { leading: <Button variant="ghost" size="icon" aria-label="Back">‹</Button> },
    Actions: { children: <Button variant="ghost" size="icon" aria-label="New note">+</Button> },
  },
};
