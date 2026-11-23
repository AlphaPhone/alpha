import { expect, fn, screen, userEvent, waitFor } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { SelectContent, SelectItem, type SelectProps, SelectTrigger } from "./Select.tsx";

const onValueChange = fn();
const children = (
  <>
    <SelectTrigger aria-label="Folder" placeholder="Folder" />
    <SelectContent>
      <SelectItem value="inbox">Inbox</SelectItem>
      <SelectItem value="archive">Archive</SelectItem>
      <SelectItem value="spam" disabled>Spam</SelectItem>
    </SelectContent>
  </>
);

export const meta: ComponentMeta<SelectProps> = {
  args: { children, onValueChange },
  examples: { Chosen: { defaultValue: "archive" } },
  play: {
    Default: async () => {
      onValueChange.mockClear();
      const trigger = screen.getByRole("combobox", { name: "Folder" });
      trigger.focus();
      await userEvent.keyboard("{Enter}");
      await expect(await screen.findByRole("option", { name: "Inbox" })).toBeTruthy();
      await userEvent.keyboard("{ArrowDown}{Enter}");
      await waitFor(() => expect([onValueChange.mock.calls, screen.queryByRole("listbox"), trigger.textContent]).toEqual([[["archive"]], null, "Archive"]));
    },
  },
};
