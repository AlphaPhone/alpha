import { NotebookPen } from "lucide-react";
import type { ComponentMeta } from "vibestack/stories";
import type { AppFrameProps } from "./AppFrame.tsx";

export const meta: ComponentMeta<AppFrameProps> = {
  args: {
    screens: [{
      id: "notes", title: "Notes", icon: NotebookPen, availability: "everywhere",
      Screen: () => <p>Notes</p>,
      back: () => Promise.resolve(false),
    }],
  },
};
