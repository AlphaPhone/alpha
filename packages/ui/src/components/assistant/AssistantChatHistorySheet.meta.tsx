import { expect, fn, screen, userEvent, waitFor } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AssistantChatHistorySheetProps } from "./AssistantChatHistorySheet.tsx";

const onOpenChange = fn();

export const meta: ComponentMeta<AssistantChatHistorySheetProps> = {
  args: {
    open: true,
    onOpenChange,
    history: {
      chats: [{ id: "4", title: "Friday plans", detail: "Today", current: true }, { id: "3", title: "Dentist and invoices", detail: "Yesterday" }],
      onChoose: fn(),
      onStart: fn(),
    },
  },
  play: {
    Default: async () => {
      onOpenChange.mockClear();
      await expect(await screen.findByRole("dialog", { name: "Chats" })).toBeTruthy();
      await userEvent.keyboard("{Escape}");
      await waitFor(() => expect(onOpenChange.mock.calls).toEqual([[false]]));
    },
  },
};
