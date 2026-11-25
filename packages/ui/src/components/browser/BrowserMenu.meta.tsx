import type { ComponentMeta } from "vibestack/stories";
import { Download, History, Plus, RotateCw } from "lucide-react";
import type { BrowserMenuProps } from "./BrowserMenu.tsx";

const press = () => {};

export const meta: ComponentMeta<BrowserMenuProps> = {
  args: {
    items: [
      { label: "Reload", name: "Reload page", icon: <RotateCw />, onSelect: press },
      { label: "New tab", icon: <Plus />, onSelect: press },
      { label: "Library", name: "Library, bookmarks and history", icon: <History />, onSelect: press },
      { label: "Downloads", icon: <Download />, onSelect: press },
    ],
    onClose: press,
  },
};
