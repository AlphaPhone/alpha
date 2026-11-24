import { Bell } from "lucide-react";
import type { ComponentMeta } from "vibestack/stories";
import { Avatar } from "./Avatar.tsx";
import type { ListRowProps } from "./ListRow.tsx";

export const meta: ComponentMeta<ListRowProps> = {
  args: {
    title: "Notifications",
    detail: "Calls, messages and reminders",
    leading: <Bell aria-hidden className="size-5" />,
    trailing: "On",
    onClick: () => undefined,
  },
  examples: {
    Person: { title: "Alpha Phone", detail: "Assistant · tap to chat", leading: <Avatar name="Alpha Phone" />, trailing: "9:41" },
    "Title only": { detail: undefined, leading: undefined, trailing: undefined },
    Long: {
      title: "Receipts, warranties and other paperwork to keep for taxes this year",
      detail: "Updated yesterday at 6:12 PM · 48 files · shared with nobody · stored on this phone",
      trailing: "1.2 GB",
    },
    AsChild: { asChild: true, children: <a href="#settings-notifications">Notifications</a> },
  },
};
