import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { fullHeight } from "./samples.ts";
import type { SettingsAppsPageProps } from "./SettingsAppsPage.tsx";

const onOpen = fn();
const onOpenApp = fn();
const onHandOver = fn();

export const meta: ComponentMeta<SettingsAppsPageProps> = {
  args: { onBack: fn(), onOpen, onOpenApp, onHandOver },
  decorator: fullHeight,
  examples: { "Returning to a row": { place: 2 } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onOpen.mockClear();
      onOpenApp.mockClear();
      onHandOver.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Workflows" }));
      await userEvent.click(canvas.getByRole("button", { name: "Files" }));
      await userEvent.click(canvas.getByRole("button", { name: "Password manager" }));
      await expect([onOpen.mock.calls, onOpenApp.mock.calls, onHandOver.mock.calls]).toEqual([[["workflows"]], [["files"]], [["password-manager"]]]);
    },
    "Returning to a row": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(document.activeElement).toBe(within(canvasElement).getByRole("button", { name: "Calendar" })),
  },
};
