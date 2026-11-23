import type { ComponentMeta } from "vibestack/stories";
import type { NotificationShadeProps } from "./NotificationShade.tsx";
import { shade } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<NotificationShadeProps> = {
  args: { shade, onOpenChange: none, onPress: none, onSwipe: none, onClearAll: none, onSelect: none, onAsk: none },
  examples: { Empty: { shade: { ...shade, rows: [] } }, Changed: { shade: { ...shade, report: "ReportChanged" } } },
};
