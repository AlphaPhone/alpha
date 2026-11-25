import type { ComponentMeta } from "vibestack/stories";
import type { HomeMailCardProps } from "./HomeMailCard.tsx";

export const meta: ComponentMeta<HomeMailCardProps> = {
  args: { unread: 3, lines: [{ title: "Ana Lima", detail: "Lunch on Friday?" }, { title: "City library", detail: "Your hold is ready" }] },
  examples: { "Not current": { notCurrent: true } },
};
