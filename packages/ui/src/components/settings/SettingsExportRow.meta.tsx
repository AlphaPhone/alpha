import { expect, fn, userEvent, within } from "storybook/test";
import type { ComponentMeta } from "vibestack/stories";
import { inGroup } from "./samples.ts";
import type { SettingsExportRowProps } from "./SettingsExportRow.tsx";

const onExport = fn();

export const meta: ComponentMeta<SettingsExportRowProps> = {
  args: { onExport },
  decorator: inGroup,
  examples: { Exporting: { exporting: true } },
  play: {
    Default: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      onExport.mockClear();
      await userEvent.click(within(canvasElement).getByRole("button", { name: "Export diagnostics" }));
      await expect(onExport.mock.calls.length).toBe(1);
    },
    Exporting: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
      const canvas = within(canvasElement);
      await expect(canvas.getByRole("status", { name: "Exporting" })).toBeTruthy();
      await expect(canvas.queryByRole("button")).toBeNull();
    },
  },
};
