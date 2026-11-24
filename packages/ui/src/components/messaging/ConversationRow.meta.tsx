import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { ConversationRowProps } from "./ConversationRow.tsx";

const onSelect = fn();

export const meta: ComponentMeta<ConversationRowProps> = {
  args: {
    title: "Ana Lima",
    kind: "direct",
    online: true,
    time: "14:22",
    preview: "Are we still on for the design review?",
    unreadCount: 2,
    onSelect,
  },
  examples: {
    "Public channel": {
      title: "design-systems",
      kind: "channel-public",
      online: false,
      previewSender: "Bruno",
      preview: "Updated the token contrast check",
      unreadCount: 0,
      unread: true,
      mentionCount: 1,
    },
    "Private channel muted": {
      title: "release-ops",
      kind: "channel-private",
      online: false,
      muted: true,
      pinned: true,
      unreadCount: 14,
      preview: "Build 42 uploaded",
    },
    Typing: {
      title: "Core Team",
      kind: "group",
      online: false,
      typing: "Carla is typing…",
      unreadCount: 0,
    },
    Selected: {
      selected: true,
      unreadCount: 0,
    },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onSelect.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: /Ana Lima/ }));
      await expect(onSelect.mock.calls.length).toBe(1);
    },
  },
};
