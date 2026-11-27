import type { ComponentMeta } from "vibestack/stories";
import type { HomeMailCardProps } from "./HomeMailCard.tsx";

export const meta: ComponentMeta<HomeMailCardProps> = {
  args: { unread: 3, lines: [{ title: "Lunch on Friday?", detail: "Ana Lima" }, { title: "Your hold is ready", detail: "City library" }], status: "ana@example.com · Updated 9:41 AM" },
  examples: {
    "Read failed": { status: "Open to retry · last updated 9:41 AM" },
    Updating: { status: "Updating email…" },
    "Partial page": { unread: 17, more: true, status: "Recent email · Updated Mon, Nov 23 9:41 AM" },
  },
};
