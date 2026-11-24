import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import type { AssistantSearchProps } from "./AssistantSearch.tsx";
import { presses } from "./plays.ts";

const onWordsChange = fn();
const onOpenHit = fn();
const onMore = fn();

const hits = [
  { id: "1", chat: "Friday plans", snippet: "Lunch with Ana is at 12:30", when: "Today", here: true },
  { id: "2", chat: "Dentist and invoices", snippet: "Lunch is covered by the invoice from Bruno", when: "Yesterday" },
];

export const meta: ComponentMeta<AssistantSearchProps> = {
  args: { words: "lunch", hits, status: "loaded", onWordsChange, onOpenHit, onMore: undefined },
  examples: {
    Idle: { words: "", hits: [], status: "idle" },
    Loading: { hits: [], status: "loading" },
    "Nothing found": { hits: [], words: "flight" },
    "More hits": { onMore },
    "Failed, with hits kept": { status: "failed" },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onWordsChange.mockClear();
      onOpenHit.mockClear();
      const canvas = within(canvasElement);
      await userEvent.type(canvas.getByRole("searchbox", { name: "Search chats" }), "s");
      await userEvent.click(canvas.getByRole("button", { name: /Lunch with Ana/ }));
      await expect([onWordsChange.mock.calls, onOpenHit.mock.calls]).toEqual([[["lunchs"]], [["1"]]]);
    },
    Blocked: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onOpenHit.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: /invoice from Bruno/ }), { pointerEventsCheck: 0 });
      await userEvent.click(canvas.getByRole("button", { name: /Lunch with Ana/ }));
      await expect(onOpenHit.mock.calls).toEqual([["1"]]);
    },
    "More hits": presses("More", onMore),
  },
};
