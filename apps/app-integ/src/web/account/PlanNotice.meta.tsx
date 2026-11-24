import type { ComponentMeta } from "vibestack/stories";
import type { PlanNoticeProps } from "./PlanNotice.tsx";
import { openSheet } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<PlanNoticeProps> = {
  args: { sheet: { ...openSheet, open: false, covered: false, planRequired: true }, onOpen: none, onDismiss: none },
};
