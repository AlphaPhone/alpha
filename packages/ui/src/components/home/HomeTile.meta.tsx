import { Mail, StickyNote } from "lucide-react";
import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { HomeTileProps } from "./HomeTile.tsx";

const onRemove = fn();

export const meta: ComponentMeta<HomeTileProps> = {
  args: { label: "Notes", icon: <StickyNote className="size-6" />, onRemove },
  examples: {
    Badge: { label: "Inbox", icon: <Mail className="size-6" />, badge: "3 unread" },
    Editing: { editing: true },
    "Editing while saving": { editing: true, onRemove: undefined },
    "Drop before": { editing: true, drop: "before" },
    "Drop after": { editing: true, drop: "after" },
    Dragging: { editing: true, dragging: true },
  },
  play: {
    Editing: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onRemove.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Remove Notes" }));
      await expect(onRemove.mock.calls.length).toBe(1);
    },
    "Editing while saving": ({ canvasElement }: { canvasElement: HTMLElement }) =>
      expect(within(canvasElement).getByRole("button", { name: "Remove Notes" })).toBeDisabled(),
  },
};
