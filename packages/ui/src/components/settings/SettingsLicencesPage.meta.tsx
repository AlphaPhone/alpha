import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { fullHeight } from "./samples.ts";
import type { SettingsLicencesPageProps } from "./SettingsLicencesPage.tsx";

const onQuery = fn();
const onOpen = fn();

const licences = [
  { name: "react", licence: "MIT" },
  { name: "lucide-react", licence: "ISC" },
  { name: "tailwindcss", licence: "MIT" },
  { name: "effect", licence: "MIT" },
];

export const meta: ComponentMeta<SettingsLicencesPageProps> = {
  args: { load: "loaded", found: 4, query: "", licences, onBack: fn(), onQuery, onOpen },
  decorator: fullHeight,
  examples: {
    Loading: { load: "loading", found: 0, licences: [] },
    Failed: { load: "failed", found: 0, licences: [] },
    "None found": { found: 0, licences: [] },
    Searched: { query: "mit", licences: [licences[0], licences[2], licences[3]] },
    "No match": { query: "zzz", licences: [] },
    "Returning to a row": { place: 2 },
  },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onQuery.mockClear();
      onOpen.mockClear();
      const canvas = within(canvasElement);
      await userEvent.type(canvas.getByRole("searchbox", { name: "Search licenses" }), "m");
      await userEvent.click(canvas.getByRole("button", { name: /tailwindcss/ }));
      await expect([onQuery.mock.calls, onOpen.mock.calls]).toEqual([[["m"]], [[2]]]);
    },
    Loading: ({ canvasElement }: { canvasElement: HTMLElement }) => expect(within(canvasElement).getByRole("searchbox", { name: "Search licenses" }).hasAttribute("disabled")).toBe(true),
    "Returning to a row": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(document.activeElement).toBe(within(canvasElement).getByRole("button", { name: /tailwindcss/ })),
  },
};
