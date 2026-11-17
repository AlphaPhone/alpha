import { StickyNote } from "lucide-react";
import type { ComponentMeta } from "vibestack/stories";
import { Button } from "./Button.tsx";
import type { EmptyStateProps } from "./EmptyState.tsx";

export const meta: ComponentMeta<EmptyStateProps> = {
  args: { title: "No notes", children: <Button>New note</Button> },
  examples: { Icon: { icon: <StickyNote /> } },
};
