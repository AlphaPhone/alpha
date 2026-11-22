import type { ComponentMeta } from "vibestack/stories";
import type { GooglePanelProps } from "./GooglePanel.tsx";
import { accessSaved, googleConnected, googleRows, googleWaiting } from "./fixtures.ts";

const none = () => undefined;

export const meta: ComponentMeta<GooglePanelProps> = {
  args: {
    google: googleConnected, accounts: googleRows, access: accessSaved, onConnect: none, onAllowCalendar: none,
    onCancel: none, onDisconnect: none, onReload: none, onAccess: none,
  },
  examples: { Waiting: { google: googleWaiting }, Calendar: { google: { ...googleConnected, panel: "CalendarPanel", choice: true, asked: ["CalendarRead", "CalendarWrite"] } } },
};
