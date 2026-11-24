import { expect, fn, screen, userEvent, waitFor } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AssistantSearchSheetProps } from "./AssistantSearchSheet.tsx";

const onOpenChange = fn();

export const meta: ComponentMeta<AssistantSearchSheetProps> = {
  args: {
    open: true,
    onOpenChange,
    search: { words: "lunch", hits: [{ id: "1", chat: "Friday plans", snippet: "Lunch with Ana is at 12:30", when: "Today", here: true }], status: "loaded", onWordsChange: fn(), onOpenHit: fn() },
  },
  play: {
    Default: async () => {
      onOpenChange.mockClear();
      await expect(await screen.findByRole("dialog", { name: "Search chats" })).toBeTruthy();
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(onOpenChange.mock.calls).toEqual([[false]]));
    },
  },
};
