import type { ComponentMeta } from "vibestack/stories";
import type { HomeMailCardProps } from "./HomeMailCard.tsx";

export const meta: ComponentMeta<HomeMailCardProps> = {
  args: { unread: 3, lines: [{ title: "Lunch on Friday?", detail: "Ana Lima" }, { title: "Your hold is ready", detail: "City library" }], status: "ana@example.com · Updated 9:41 AM" },
  examples: { "Not current": { status: "Not updated since Mon 9:41 AM" } },
};
