import { FolderPlus, Heart, Share2, Trash2 } from "lucide-react";
import { fn } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { PhotoSelectionBarProps } from "./PhotoSelectionBar.tsx";

export const meta: ComponentMeta<PhotoSelectionBarProps> = {
  args: {
    actions: [
      { label: "Share", description: "Share selected", icon: Share2, onPress: fn() },
      { label: "Favorite", description: "Favorite selected", icon: Heart, onPress: fn() },
      { label: "Add to album", description: "Add selected to album", icon: FolderPlus, onPress: fn() },
      { label: "Delete", description: "Delete selected", icon: Trash2, onPress: fn() },
    ],
  },
  examples: { "Nothing selected": { actions: [{ label: "Share", description: "Share selected", icon: Share2 }, { label: "Delete", description: "Delete selected", icon: Trash2 }] } },
};
