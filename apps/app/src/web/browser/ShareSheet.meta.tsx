import type { ComponentMeta } from "vibestack/stories";
import type { ShareSheetProps } from "./ShareSheet.tsx";
import { loadedSession } from "./fixtures.ts";

export const meta: ComponentMeta<ShareSheetProps> = {
  args: { session: { ...loadedSession, layers: { ...loadedSession.layers, share: true } } },
};
