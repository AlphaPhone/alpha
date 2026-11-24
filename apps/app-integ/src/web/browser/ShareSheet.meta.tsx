import type { ComponentMeta } from "vibestack/stories";
import type { ShareSheetProps } from "./ShareSheet.tsx";
import { loadedSession } from "./fixtures.ts";

const sharing = { ...loadedSession, layers: { ...loadedSession.layers, share: true } };

export const meta: ComponentMeta<ShareSheetProps> = {
  args: { session: sharing },
  examples: { BrowserBuild: { session: { ...sharing, host: "WebHost" } } },
};
