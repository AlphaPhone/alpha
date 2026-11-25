import type { ComponentMeta } from "vibestack/stories";
import { ChevronLeft } from "lucide-react";
import { Button } from "../Button.tsx";
import type { BrowserTabsProps } from "./BrowserTabs.tsx";

const press = () => {};

export const meta: ComponentMeta<BrowserTabsProps> = {
  args: {
    leading: <Button size="icon" variant="ghost" aria-label="Back to page" onClick={press}><ChevronLeft /></Button>,
    tabs: [
      { id: 1, title: "The case for on-device agents", where: "https://news.example/on-device-agents", current: true },
      { id: 2, title: "New private tab", where: "Private · ", private: true },
    ],
    onPick: press,
    onClose: press,
    onNew: press,
    onNewPrivate: press,
  },
};
