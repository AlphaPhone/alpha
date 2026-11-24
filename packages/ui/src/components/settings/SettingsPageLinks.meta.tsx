import { Info, LayoutGrid, ShieldCheck } from "lucide-react";
import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { inGroup } from "./samples.ts";
import type { SettingsPageLinksProps } from "./SettingsPageLinks.tsx";

const onOpen = fn();
const onPlace = fn();

export const meta: ComponentMeta<SettingsPageLinksProps> = {
  args: {
    links: [
      { page: "privacy", title: "Privacy", icon: <ShieldCheck /> },
      { page: "apps", title: "Apps", icon: <LayoutGrid /> },
      { page: "about", title: "About", icon: <Info /> },
    ],
    onOpen,
    onPlace,
  },
  decorator: inGroup,
  examples: { "Returning to a row": { place: 1 } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onOpen.mockClear();
      onPlace.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Apps" }));
      await expect([onOpen.mock.calls, onPlace.mock.calls.at(-1)]).toEqual([[["apps"]], [1]]);
    },
    "Returning to a row": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(document.activeElement).toBe(within(canvasElement).getByRole("button", { name: "Apps" })),
  },
};
