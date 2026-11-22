import type { ComponentMeta } from "vibestack/stories";
import type { BrowserToolbarProps } from "./BrowserToolbar.tsx";
import { blankSession, loadedSession, loadingSession, privateSession } from "./fixtures.ts";

export const meta: ComponentMeta<BrowserToolbarProps> = {
  args: { session: loadedSession },
  examples: { NewTab: { session: blankSession }, Loading: { session: loadingSession }, Private: { session: privateSession } },
};
