import type { ComponentMeta } from "vibestack/stories";
import type { AppTileProps } from "./AppTile.tsx";
import { Mark } from "./Mark.tsx";

export const meta: ComponentMeta<AppTileProps> = {
  args: { label: "Notes", icon: <Mark className="size-6" /> },
  examples: { Badge: { label: "Inbox", badge: "3 unread" } },
};
