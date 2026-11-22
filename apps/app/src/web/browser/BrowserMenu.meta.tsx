import type { ComponentMeta } from "vibestack/stories";
import type { BrowserMenuProps } from "./BrowserMenu.tsx";
import { idleReading, menuSession } from "./fixtures.ts";

export const meta: ComponentMeta<BrowserMenuProps> = {
  args: { session: menuSession, reading: idleReading, marked: false },
  examples: {
    Bookmarked: { session: menuSession, reading: idleReading, marked: true },
    BrowserBuild: { session: { ...menuSession, host: "WebHost" }, reading: idleReading, marked: false },
    ReadingUnsupported: { session: menuSession, reading: { ...idleReading, support: "Unsupported" }, marked: false },
  },
};
