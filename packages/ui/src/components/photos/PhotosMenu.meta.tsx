import { ListChecks, Plus } from "lucide-react";
import { fn } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { PhotosMenuProps } from "./PhotosMenu.tsx";

export const meta: ComponentMeta<PhotosMenuProps> = {
  args: { label: "Photos tools", actions: [{ label: "Select", description: "Select photos", icon: ListChecks, onSelect: fn() }] },
  examples: { "On the Albums tab": { actions: [{ label: "New album", icon: Plus, onSelect: fn() }] }, "Nothing to do": { actions: [] } },
};
