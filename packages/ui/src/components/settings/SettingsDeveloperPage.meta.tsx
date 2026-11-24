import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { fullHeight } from "./samples.ts";
import type { SettingsDeveloperPageProps } from "./SettingsDeveloperPage.tsx";

const onOpen = fn();
const onExport = fn();
const onTryMocks = fn();

export const meta: ComponentMeta<SettingsDeveloperPageProps> = {
  args: { onBack: fn(), onOpen, onExport, onHandOver: fn(), onAndroid: fn() },
  decorator: fullHeight,
  examples: { Exporting: { exporting: true }, "Mock mode": { onTryMocks }, "Returning to a row": { place: 3 } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onOpen.mockClear();
      onExport.mockClear();
      const canvas = within(canvasElement);
      await userEvent.click(canvas.getByRole("button", { name: "Problem log" }));
      await userEvent.click(canvas.getByRole("button", { name: "Export diagnostics" }));
      await expect([onOpen.mock.calls, onExport.mock.calls.length]).toEqual([[["problems"]], 1]);
    },
    "Mock mode": async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onTryMocks.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Try mock mode" }));
      await expect(onTryMocks.mock.calls.length).toBe(1);
    },
    "Returning to a row": ({ canvasElement }: { canvasElement: HTMLElement }) => expect(document.activeElement).toBe(within(canvasElement).getByRole("button", { name: "Calendar backups" })),
  },
};
