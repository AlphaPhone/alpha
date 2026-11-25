import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { SearchFieldProps } from "./SearchField.tsx";

const onValueChange = fn();

export const meta: ComponentMeta<SearchFieldProps> = {
  args: { value: "", "aria-label": "Search notes", onValueChange },
  examples: { Filled: { value: "lisbon" }, KeepClear: { keepClear: true }, Ref: { ref: (field: HTMLInputElement | null) => field?.focus() } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onValueChange.mockClear();
      const canvas = within(canvasElement);
      await userEvent.type(canvas.getByRole("searchbox", { name: "Search notes" }), "l");
      await expect([onValueChange.mock.calls, canvas.queryByRole("button")]).toEqual([[["l"]], null]);
    },
    KeepClear: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("button", { name: "Clear" })).toBeVisible(),
    Ref: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(document.activeElement).toBe(within(canvasElement).getByRole("searchbox")),
    Filled: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onValueChange.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Clear" }));
      await expect([onValueChange.mock.calls, document.activeElement]).toEqual([[[""]], canvas.getByRole("searchbox")]);
    },
  },
};
