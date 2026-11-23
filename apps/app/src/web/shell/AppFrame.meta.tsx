import { NotebookText } from "lucide-react";
import type { ComponentMeta } from "vibestack/stories";
import { initial, openApp } from "../../../gen/shell__navigation.ts";
import type { AppFrameProps } from "./AppFrame.tsx";

export const meta: ComponentMeta<AppFrameProps> = {
  args: {
    nav: openApp(initial, "notes", "", false),
    screens: [{ id: "notes", title: "Notes", icon: NotebookText, availability: "everywhere", Screen: () => <h2>Notes</h2>, back: async () => false }],
    failures: 0,
    onClose: () => {},
  },
};
