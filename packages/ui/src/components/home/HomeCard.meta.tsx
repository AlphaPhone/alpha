import { Mail } from "lucide-react";
import type { ComponentMeta } from "vibestack/stories";
import { type HomeCardProps, HomeCardLines } from "./HomeCard.tsx";

export const meta: ComponentMeta<HomeCardProps> = {
  args: { title: "Unread", icon: <Mail />, children: <HomeCardLines lines={[{ title: "Ana Lima", detail: "Lunch on Friday?" }]} /> },
  examples: { "With status": { status: "Updated 9:41 AM" } },
};
