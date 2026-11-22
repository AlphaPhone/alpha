import type { ComponentMeta } from "vibestack/stories";
import type { SharePanelSheetProps } from "./SharePanelSheet.tsx";
import { panel } from "./fixtures.ts";

export const meta: ComponentMeta<SharePanelSheetProps> = {
  args: { panel, title: "IMG_0001.jpg", onChoose: () => undefined },
  examples: { StaleSelection: { panel: { ...panel, invalid: [1], notice: true } }, Browser: { canSave: true } },
};
