import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { fullHeight } from "./samples.ts";
import type { SettingsAppsPageProps } from "./SettingsAppsPage.tsx";

const onOpen = fn();
const onOpenApp = fn();

export const meta: ComponentMeta<SettingsAppsPageProps> = {
  args: { onBack: fn(), onOpen, onOpenApp },
  decorator: fullHeight,
  examples: { "Returning to a row": { place: 1 } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onOpen.mockClear();
      onOpenApp.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Workflows" }));
      await userEvent.click(canvas.getByRole("button", { name: "Files" }));
      await userEvent.click(canvas.getByRole("button", { name: "Passwords" }));
      await expect([onOpen.mock.calls, onOpenApp.mock.calls]).toEqual([[["workflows"], ["passwords"]], [["files"]]]);
    },
    "Returning to a row": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(document.activeElement).toBe(within(canvasElement).getByRole("button", { name: "Calendar" })),
  },
};
