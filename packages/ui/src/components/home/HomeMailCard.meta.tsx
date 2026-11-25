import type { ComponentMeta } from "vibestack/stories";
import type { HomeMailCardProps } from "./HomeMailCard.tsx";

export const meta: ComponentMeta<HomeMailCardProps> = {
  args: { unread: 3, lines: [{ title: "Lunch on Friday?", detail: "Ana Lima" }, { title: "Your hold is ready", detail: "City library" }], status: "ana@example.com · Updated 1:32 PM" },
  examples: { "Not current": { notCurrent: true }, "More than one page": { unread: 17, more: true, status: "Recent email · Updated 10:24 PM" } },
};
